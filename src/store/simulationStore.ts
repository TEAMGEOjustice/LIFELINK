import { create } from "zustand";

// ── Production Geo-Spatial Types ──────────────────
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface MockDonor {
  id: string;
  location: GeoPoint;
  isMatched: boolean;
}

// Alias for backward compat with any existing code using MapDonor
export type MapDonor = MockDonor;

export interface MapEmergency {
  id: string;
  blood_group: string;
  units_required: number;
  urgency: "low" | "medium" | "high" | "critical";
  location: GeoPoint;
  created_at: number;
}

// Alias matching repo's type name
export type Emergency = MapEmergency;

export interface SearchRadius {
  center: GeoPoint;
  radiusKm: number;
}

export interface ActiveRoute {
  start: GeoPoint;
  end: GeoPoint;
}

export interface Hospital {
  id: string;
  name: string;
  shortName: string;
  location: GeoPoint;
  beds?: number;
  bloodBank: boolean;
}

// Alias for backward compat
export type MapHospital = Hospital;

// ── Default hospital nodes (Bangalore) ──────────────────────────────
const DEFAULT_HOSPITALS: Hospital[] = [
  { id: "h1", name: "Apollo Hospitals", shortName: "Apollo", location: { latitude: 12.9698, longitude: 77.6434 }, beds: 700, bloodBank: true },
  { id: "h2", name: "Manipal Hospital", shortName: "Manipal", location: { latitude: 12.9606, longitude: 77.5681 }, beds: 600, bloodBank: true },
  { id: "h3", name: "Fortis Hospital", shortName: "Fortis", location: { latitude: 13.0158, longitude: 77.5488 }, beds: 400, bloodBank: false },
  { id: "h4", name: "Narayana Health", shortName: "Narayana", location: { latitude: 12.889, longitude: 77.6444 }, beds: 1000, bloodBank: true },
  { id: "h5", name: "St. Johns Medical", shortName: "St. John's", location: { latitude: 12.9453, longitude: 77.617 }, beds: 1200, bloodBank: true },
];

// ── Store interface ──────────────────────────────────────────────────
interface SimulationState {
  userLocation: GeoPoint | null;
  mockDonors: MockDonor[];
  hospitals: Hospital[];
  activeEmergencies: MapEmergency[];
  searchRadius: SearchRadius | null;
  activeRoute: ActiveRoute | null;
  animations: {
    blink: boolean;
    pulse: boolean;
    routing: boolean;
  };

  // Setters
  setUserLocation: (loc: GeoPoint) => void;
  generateMockDonors: (center: GeoPoint) => void;
  setHospitals: (hospitals: Hospital[]) => void;
  setMockDonors: (donors: MockDonor[]) => void;
  setSearchRadius: (search: SearchRadius | null) => void;
  setActiveRoute: (route: ActiveRoute | null) => void;

  // Emergency management
  addEmergency: (emergency: MapEmergency) => void;
  removeEmergency: (id: string) => void;
  highlightMatchedDonors: (bloodGroup: string, emergencyLocation: GeoPoint) => void;

  // Animation controls
  toggleAnimation: (key: "blink" | "pulse" | "routing") => void;
  setAllAnimations: (playing: boolean) => void;
  setAnimations: (flags: Partial<SimulationState["animations"]>) => void;
}

// ── Store ────────────────────────────────────────────────────────────
export const useSimulationStore = create<SimulationState>((set) => ({
  userLocation: null,
  mockDonors: [],
  hospitals: DEFAULT_HOSPITALS,
  activeEmergencies: [],
  searchRadius: null,
  activeRoute: null,
  animations: { blink: true, pulse: true, routing: true },

  setUserLocation: (loc) => set({ userLocation: loc }),

  generateMockDonors: (center) => {
    const donors: MockDonor[] = Array.from({ length: 60 }, (_, i) => ({
      id: `d-${i}`,
      location: {
        latitude: center.latitude + (Math.random() - 0.5) * 0.08,
        longitude: center.longitude + (Math.random() - 0.5) * 0.08,
      },
      isMatched: Math.random() < 0.15,
    }));
    set({ mockDonors: donors });
  },

  setHospitals: (hospitals) => set({ hospitals }),
  setMockDonors: (donors) => set({ mockDonors: donors }),
  setSearchRadius: (search) => set({ searchRadius: search }),
  setActiveRoute: (route) => set({ activeRoute: route }),

  addEmergency: (emergency) =>
    set((state) => ({ activeEmergencies: [...state.activeEmergencies, emergency] })),

  removeEmergency: (id) =>
    set((state) => ({
      activeEmergencies: state.activeEmergencies.filter((e) => e.id !== id),
    })),

  highlightMatchedDonors: (bloodGroup, emergencyLocation) =>
    set((state) => {
      const isUniversal = bloodGroup.includes("-");
      const updated = state.mockDonors.map((donor) => {
        const latDiff = donor.location.latitude - emergencyLocation.latitude;
        const lonDiff = donor.location.longitude - emergencyLocation.longitude;
        const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111;
        const isBloodMatch =
          (donor as any).blood_group === bloodGroup ||
          (isUniversal && (donor as any).blood_group === "O-");
        return { ...donor, isMatched: isBloodMatch && distance < 10 };
      });
      return { mockDonors: updated };
    }),

  toggleAnimation: (key) =>
    set((s) => ({ animations: { ...s.animations, [key]: !s.animations[key] } })),

  setAllAnimations: (playing) =>
    set({ animations: { blink: playing, pulse: playing, routing: playing } }),

  setAnimations: (flags) =>
    set((s) => ({ animations: { ...s.animations, ...flags } })),
}));
