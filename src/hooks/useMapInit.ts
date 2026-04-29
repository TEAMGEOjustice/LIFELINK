/**
 * useMapInit — Seeds the simulation store with production-grade geo-spatial
 * datasets for Bangalore and initializes a demo emergency route.
 * Call this once at the top of any dashboard that renders <MapSection />.
 */
import { useEffect } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { BANGALORE_HOSPITALS, buildBangaloreDonors } from "@/data/bangaloreDataset";

const DEMO_CENTER = { latitude: 12.9716, longitude: 77.5946 };

export function useMapInit(userCenter?: { latitude: number; longitude: number }) {
  const { setUserLocation, setMockDonors, setHospitals } = useSimulationStore();

  useEffect(() => {
    const center = userCenter ?? DEMO_CENTER;

    setUserLocation(center);
    setHospitals(BANGALORE_HOSPITALS as any);

    const donors = buildBangaloreDonors(6);
    setMockDonors(donors as any);

    // Seed a demo critical emergency + nearest-donor route
    const sourceHospital = BANGALORE_HOSPITALS[0];
    const emergency = {
      id: "demo-em-1",
      location: sourceHospital.location,
      blood_group: "O-",
      units_required: 3,
      urgency: "critical" as const,
      created_at: Date.now(),
    };

    const nearestDonor = donors
      .slice()
      .sort((a, b) => {
        const da =
          (a.location.latitude - sourceHospital.location.latitude) ** 2 +
          (a.location.longitude - sourceHospital.location.longitude) ** 2;
        const db =
          (b.location.latitude - sourceHospital.location.latitude) ** 2 +
          (b.location.longitude - sourceHospital.location.longitude) ** 2;
        return da - db;
      })[1]; // skip [0] which is right at the hospital

    useSimulationStore.setState({
      activeEmergencies: [emergency],
      activeRoute: nearestDonor
        ? { start: nearestDonor.location, end: emergency.location }
        : null,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
