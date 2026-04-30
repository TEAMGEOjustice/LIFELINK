import type { GeoPoint, MockDonor } from "@/store/simulationStore";

export interface Hospital {
  id: string;
  name: string;
  shortName: string;
  location: GeoPoint;
  beds?: number;
  bloodBank: boolean;
}

/**
 * Curated list of well-known Bangalore hospitals.
 * Coordinates approximate from public sources — for demo only.
 */
export const BANGALORE_HOSPITALS: Hospital[] = [
  { id: "h-manipal-old-airport", name: "Manipal Hospital, Old Airport Road", shortName: "Manipal", location: { latitude: 12.9583, longitude: 77.6493 }, beds: 650, bloodBank: true },
  { id: "h-apollo-bannerghatta", name: "Apollo Hospital, Bannerghatta Road", shortName: "Apollo", location: { latitude: 12.8916, longitude: 77.5975 }, beds: 250, bloodBank: true },
  { id: "h-fortis-bg", name: "Fortis Hospital, Bannerghatta", shortName: "Fortis", location: { latitude: 12.8881, longitude: 77.5970 }, beds: 400, bloodBank: true },
  { id: "h-narayana-hsr", name: "Narayana Health City", shortName: "Narayana", location: { latitude: 12.8094, longitude: 77.6779 }, beds: 1000, bloodBank: true },
  { id: "h-columbia-asia-yeshwanthpur", name: "Columbia Asia, Yeshwanthpur", shortName: "Columbia Asia", location: { latitude: 13.0289, longitude: 77.5408 }, beds: 200, bloodBank: false },
  { id: "h-sakra-world", name: "Sakra World Hospital, Bellandur", shortName: "Sakra", location: { latitude: 12.9352, longitude: 77.6892 }, beds: 300, bloodBank: true },
  { id: "h-mallya", name: "Mallya Hospital, Vittal Mallya Road", shortName: "Mallya", location: { latitude: 12.9716, longitude: 77.5959 }, beds: 120, bloodBank: true },
  { id: "h-st-johns", name: "St. John's Medical College Hospital", shortName: "St. John's", location: { latitude: 12.9279, longitude: 77.6203 }, beds: 1350, bloodBank: true },
  { id: "h-victoria", name: "Victoria Hospital", shortName: "Victoria", location: { latitude: 12.9608, longitude: 77.5739 }, beds: 1050, bloodBank: true },
  { id: "h-bowring", name: "Bowring & Lady Curzon Hospital", shortName: "Bowring", location: { latitude: 12.9826, longitude: 77.6047 }, beds: 500, bloodBank: false },
  { id: "h-aster-cmi", name: "Aster CMI Hospital, Hebbal", shortName: "Aster CMI", location: { latitude: 13.0473, longitude: 77.5945 }, beds: 500, bloodBank: true },
  { id: "h-rainbow-marathahalli", name: "Rainbow Children's Hospital, Marathahalli", shortName: "Rainbow", location: { latitude: 12.9569, longitude: 77.7011 }, beds: 150, bloodBank: false },
];

const BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

// Realistic-ish donor names (sampled common Indian names; demo data only)
const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna",
  "Ishaan", "Rohan", "Kabir", "Dev", "Ananya", "Diya", "Aadhya", "Saanvi",
  "Pari", "Myra", "Anika", "Navya", "Riya", "Kavya", "Sara", "Aisha",
];
const LAST_NAMES = [
  "Sharma", "Verma", "Iyer", "Reddy", "Nair", "Rao", "Menon", "Kumar",
  "Patel", "Shetty", "Gowda", "Hegde", "Pillai", "Bose", "Khan", "Das",
];

function seededRand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export interface RealDonor extends MockDonor {
  name: string;
  bloodGroup: string;
  hospitalId: string;
  lastDonation: string; // ISO date
}

/**
 * Generates donors clustered around real hospitals (deterministic via seed).
 */
export function buildBangaloreDonors(perHospital = 6, seed = 42): RealDonor[] {
  const rnd = seededRand(seed);
  const donors: RealDonor[] = [];

  BANGALORE_HOSPITALS.forEach((h, hi) => {
    for (let i = 0; i < perHospital; i++) {
      // Tight cluster within ~1.5km
      const dLat = (rnd() - 0.5) * 0.022;
      const dLon = (rnd() - 0.5) * 0.022;
      const fn = FIRST_NAMES[Math.floor(rnd() * FIRST_NAMES.length)];
      const ln = LAST_NAMES[Math.floor(rnd() * LAST_NAMES.length)];
      const bg = BLOOD_GROUPS[Math.floor(rnd() * BLOOD_GROUPS.length)];
      const daysAgo = Math.floor(rnd() * 180);
      const last = new Date(Date.now() - daysAgo * 86400_000).toISOString();

      donors.push({
        id: `d-${h.id}-${i}`,
        name: `${fn} ${ln}`,
        bloodGroup: bg,
        hospitalId: h.id,
        lastDonation: last,
        location: {
          latitude: h.location.latitude + dLat,
          longitude: h.location.longitude + dLon,
        },
        isMatched: rnd() < 0.12,
      });
    }
  });

  // Add a small number of "free-floating" donors not tied to a hospital
  const center = { latitude: 12.9716, longitude: 77.5946 };
  for (let i = 0; i < 18; i++) {
    const fn = FIRST_NAMES[Math.floor(rnd() * FIRST_NAMES.length)];
    const ln = LAST_NAMES[Math.floor(rnd() * LAST_NAMES.length)];
    const bg = BLOOD_GROUPS[Math.floor(rnd() * BLOOD_GROUPS.length)];
    donors.push({
      id: `d-free-${i}`,
      name: `${fn} ${ln}`,
      bloodGroup: bg,
      hospitalId: "",
      lastDonation: new Date(Date.now() - Math.floor(rnd() * 365) * 86400_000).toISOString(),
      location: {
        latitude: center.latitude + (rnd() - 0.5) * 0.14,
        longitude: center.longitude + (rnd() - 0.5) * 0.14,
      },
      isMatched: rnd() < 0.08,
    });
  }

  return donors;
}