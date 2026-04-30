import { useEffect, useRef, useState, useMemo } from "react";
import { useSimulationStore, GeoPoint } from "@/store/simulationStore";
import { useOrchestration } from "@/hooks/useOrchestration";
import "mapbox-gl/dist/mapbox-gl.css";

/**
 * LiveMap — Production-grade emergency intelligence interface.
 * - Mapbox GL only (no react-map-gl)
 * - GeoJSON + clustered circle layer for donors (perf)
 * - Hover/click interactions, pulse waves, animated routing
 * - HUD with latency, AI status, animated counters
 */

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

interface LiveMapProps {
  centerCoords?: GeoPoint;
  userRole?: "hospital" | "donor";
}

// ── Utility: haversine for nearest-donor calculation ────────────────
function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ── Animated counter hook ───────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 600): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef<number>(0);

  useEffect(() => {
    fromRef.current = value;
    startRef.current = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(fromRef.current + (target - fromRef.current) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

// ── Inner client-only map ───────────────────────────────────────────
function MapInner({ centerCoords, userRole = "hospital" }: LiveMapProps) {
  const { beat, pulse } = useOrchestration();
  const mapContainer = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emergencyMarkersRef = useRef<Map<string, any>>(new Map());
  const styleLoadedRef = useRef(false);
  const layersAddedRef = useRef(false);
  const radiusAddedRef = useRef(false);
  const routeAddedRef = useRef(false);
  const pulseAddedRef = useRef(false);
  const hoveredDonorIdRef = useRef<string | number | null>(null);
  const dashOffsetRef = useRef(0);
  const pulseStartRef = useRef(0);
  // Smoothed [0..1] visibility factor for routing animation (eased)
  const routeFadeRef = useRef(1);
  const lastFrameRef = useRef(0);

  const {
    userLocation,
    setUserLocation,
    generateMockDonors,
    mockDonors,
    activeEmergencies,
    searchRadius,
    activeRoute,
  } = useSimulationStore();
  const hospitals = useSimulationStore((s) => s.hospitals);

  // ── INIT MAP (unchanged core) ─────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    import("mapbox-gl").then((mapboxglModule) => {
      const mapboxgl = mapboxglModule.default;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const defaultCenter: [number, number] = centerCoords
        ? [centerCoords.longitude, centerCoords.latitude]
        : [77.5946, 12.9716];

      map.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center: defaultCenter,
        zoom: 12,
        accessToken: MAPBOX_TOKEN,
        attributionControl: false,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.current.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        "bottom-right"
      );

      map.current.on("load", () => {
        styleLoadedRef.current = true;

        // ── Donor cluster source + layers ──────────────────────────
        map.current.addSource("donors", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        // Cluster bubbles — color scaled by density
        map.current.addLayer({
          id: "donor-clusters",
          type: "circle",
          source: "donors",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#22c55e", // <10
              10, "#eab308", // 10–24
              25, "#f97316", // 25–49
              50, "#ef4444", // 50+
            ],
            "circle-radius": [
              "step",
              ["get", "point_count"],
              14, 10, 18, 25, 24, 50, 30,
            ],
            "circle-opacity": 0.85,
            "circle-stroke-width": 2,
            "circle-stroke-color": "rgba(255,255,255,0.25)",
          },
        });

        map.current.addLayer({
          id: "donor-cluster-count",
          type: "symbol",
          source: "donors",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
            "text-size": 12,
          },
          paint: { "text-color": "#0b0f1a" },
        });

        // Unclustered donor points — driven by feature props
        map.current.addLayer({
          id: "donor-points",
          type: "circle",
          source: "donors",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": [
              "case",
              ["==", ["get", "matched"], true], "#4ade80",
              "rgba(148,163,184,0.85)",
            ],
            // Signal-strength radius — varies with `signal` prop (0..1)
            "circle-radius": [
              "interpolate", ["linear"], ["get", "signal"],
              0, 3,
              1, 7,
            ],
            "circle-opacity": [
              "interpolate", ["linear"], ["get", "signal"],
              0, 0.25,
              1, 1,
            ],
            "circle-stroke-width": [
              "case",
              ["==", ["get", "hover"], true], 3,
              ["==", ["get", "matched"], true], 2,
              0,
            ],
            "circle-stroke-color": [
              "case",
              ["==", ["get", "hover"], true], "#ffffff",
              "rgba(74,222,128,0.85)",
            ],
          },
        });

        // ── Emergency pulse wave source + layer ────────────────────
        map.current.addSource("emergency-pulse", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.current.addLayer({
          id: "emergency-pulse-layer",
          type: "circle",
          source: "emergency-pulse",
          paint: {
            "circle-radius": 8,
            "circle-color": "#ef4444",
            "circle-opacity": 0.6,
            "circle-stroke-color": "#ef4444",
            "circle-stroke-width": 2,
            "circle-stroke-opacity": 0.8,
          },
        });
        pulseAddedRef.current = true;

        layersAddedRef.current = true;

        // ── Hospital source + layers ───────────────────────────────
        map.current.addSource("hospitals", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        // Outer halo
        map.current.addLayer({
          id: "hospital-halo",
          type: "circle",
          source: "hospitals",
          paint: {
            "circle-radius": 14,
            "circle-color": "#22d3ee",
            "circle-opacity": 0.12,
            "circle-stroke-color": "#22d3ee",
            "circle-stroke-width": 1,
            "circle-stroke-opacity": 0.4,
          },
        });
        // Solid core
        map.current.addLayer({
          id: "hospital-core",
          type: "circle",
          source: "hospitals",
          paint: {
            "circle-radius": 7,
            "circle-color": [
              "case",
              ["==", ["get", "bloodBank"], true], "#22d3ee",
              "#0ea5e9",
            ],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });
        // Cross icon (using text symbol)
        map.current.addLayer({
          id: "hospital-icon",
          type: "symbol",
          source: "hospitals",
          layout: {
            "text-field": "+",
            "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
            "text-size": 11,
            "text-allow-overlap": true,
          },
          paint: { "text-color": "#0b0f1a" },
        });
        // Label below dot, only at higher zooms
        map.current.addLayer({
          id: "hospital-label",
          type: "symbol",
          source: "hospitals",
          minzoom: 12,
          layout: {
            "text-field": ["get", "shortName"],
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
            "text-size": 10,
            "text-offset": [0, 1.4],
            "text-anchor": "top",
            "text-optional": true,
          },
          paint: {
            "text-color": "#e0f2fe",
            "text-halo-color": "rgba(0,0,0,0.75)",
            "text-halo-width": 1.2,
          },
        });

        // Hospital interactions
        map.current.on("mouseenter", "hospital-core", () => {
          map.current.getCanvas().style.cursor = "pointer";
        });
        map.current.on("mouseleave", "hospital-core", () => {
          map.current.getCanvas().style.cursor = "";
        });
        map.current.on("click", "hospital-core", (e: any) => {
          const f = e.features?.[0];
          if (!f) return;
          import("mapbox-gl").then(({ default: mapboxgl }) => {
            new mapboxgl.Popup({ offset: 14, closeButton: false })
              .setLngLat(f.geometry.coordinates)
              .setHTML(
                `<div style="font-family:ui-sans-serif;color:#0f172a;min-width:160px">
                  <div style="font-weight:700;font-size:13px">${f.properties.name}</div>
                  <div style="font-size:11px;opacity:.7;margin-top:2px">
                    ${f.properties.beds ? `${f.properties.beds} beds • ` : ""}${f.properties.bloodBank === "true" || f.properties.bloodBank === true ? "Blood bank ✓" : "No blood bank"}
                  </div>
                </div>`
              )
              .addTo(map.current);
          });
        });

        // ── Interactions ────────────────────────────────────────────
        map.current.on("mouseenter", "donor-clusters", () => {
          map.current.getCanvas().style.cursor = "pointer";
        });
        map.current.on("mouseleave", "donor-clusters", () => {
          map.current.getCanvas().style.cursor = "";
        });

        // Click cluster → smooth zoom in
        map.current.on("click", "donor-clusters", (e: any) => {
          const features = map.current.queryRenderedFeatures(e.point, {
            layers: ["donor-clusters"],
          });
          const clusterId = features[0]?.properties?.cluster_id;
          const src = map.current.getSource("donors");
          src.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
            if (err) return;
            map.current.easeTo({
              center: features[0].geometry.coordinates,
              zoom,
              duration: 700,
            });
          });
        });

        // Hover donor → highlight via feature-state-equivalent (prop swap)
        map.current.on("mousemove", "donor-points", (e: any) => {
          map.current.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          if (!f) return;
          const id = f.properties?.id;
          if (hoveredDonorIdRef.current === id) return;
          hoveredDonorIdRef.current = id;
          updateDonorSource(true);
        });
        map.current.on("mouseleave", "donor-points", () => {
          map.current.getCanvas().style.cursor = "";
          if (hoveredDonorIdRef.current !== null) {
            hoveredDonorIdRef.current = null;
            updateDonorSource(true);
          }
        });

        // Click emergency → highlight nearest donors via route
        map.current.on("click", "emergency-pulse-layer", (e: any) => {
          const f = e.features?.[0];
          if (!f) return;
          const [lon, lat] = f.geometry.coordinates;
          const target: GeoPoint = { latitude: lat, longitude: lon };
          const sortedDonors = [...useSimulationStore.getState().mockDonors].sort(
            (a, b) => distanceKm(a.location, target) - distanceKm(b.location, target)
          );
          const nearest = sortedDonors[0];
          if (nearest) {
            // Draw line from nearest donor → emergency
            ensureRouteData({
              start: nearest.location,
              end: target,
            });
          }
        });

        // Init location
        if (centerCoords) {
          setUserLocation(centerCoords);
          generateMockDonors(centerCoords);
        } else if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const loc: GeoPoint = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              };
              setUserLocation(loc);
              generateMockDonors(loc);
              map.current?.flyTo({
                center: [loc.longitude, loc.latitude],
                zoom: 13,
                speed: 1.2,
              });
            },
            () => {
              const fb: GeoPoint = { latitude: 12.9716, longitude: 77.5946 };
              setUserLocation(fb);
              generateMockDonors(fb);
            }
          );
        } else {
          const fb: GeoPoint = { latitude: 12.9716, longitude: 77.5946 };
          setUserLocation(fb);
          generateMockDonors(fb);
        }

        // ── Animation loop: synced with global beat & pulse ────────
        const animate = (t: number) => {
          if (!map.current) return;
          if (!pulseStartRef.current) pulseStartRef.current = t;

          // Read global orchestration values
          const currentBeat = beat.get();
          const currentPulse = pulse.get();

          // Smoothly ease route visibility toward target (1 if dispatching, 0 if off)
          const target = currentBeat === "dispatch" ? 1 : 0;
          const dt = lastFrameRef.current ? (t - lastFrameRef.current) / 1000 : 0.016;
          lastFrameRef.current = t;
          
          // Time-constant ~250ms for a smooth but snappy fade
          const k = 1 - Math.exp(-dt / 0.25);
          routeFadeRef.current += (target - routeFadeRef.current) * k;
          const fade = routeFadeRef.current;

          // Animated pulse radius (synced to global pulse)
          if (map.current.getLayer("emergency-pulse-layer")) {
            // Pulse drives scale and opacity
            const radius = 8 + currentPulse * 24;
            const opacity = 0.4 + currentPulse * 0.4;
            
            map.current.setPaintProperty("emergency-pulse-layer", "circle-radius", radius);
            map.current.setPaintProperty("emergency-pulse-layer", "circle-opacity", opacity * 0.8);
            map.current.setPaintProperty(
              "emergency-pulse-layer",
              "circle-stroke-opacity",
              opacity
            );
          }

          // Animated dashed route line (only moves during dispatch beat)
          if (map.current.getLayer("route-line-dashed")) {
            if (currentBeat === "dispatch") {
              const a = 2 + Math.sin(t / 250) * 0.8;
              const b = 4 + Math.cos(t / 250) * 0.8;
              map.current.setPaintProperty("route-line-dashed", "line-dasharray", [a, b]);
            }
            // Collapse opacity smoothly based on beat
            map.current.setPaintProperty("route-line-dashed", "line-opacity", 0.9 * fade);
          }
          if (map.current.getLayer("route-line")) {
            map.current.setPaintProperty("route-line", "line-opacity", 0.85 * fade);
          }
          if (map.current.getLayer("route-glow")) {
            map.current.setPaintProperty("route-glow", "line-opacity", 0.18 * fade);
          }

          requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      });
    });

    return () => {
      emergencyMarkersRef.current.forEach((m) => m.remove());
      userMarkerRef.current?.remove();
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Build donor GeoJSON (signal/blink baked into props) ───────────
  const buildDonorFeatures = (signalSeed = Date.now()) => {
    const donors = useSimulationStore.getState().mockDonors;
    const hoveredId = hoveredDonorIdRef.current;
    return {
      type: "FeatureCollection" as const,
      features: donors.map((d, i) => {
        // pseudo-random signal strength per donor, varying with time
        const s =
          0.35 +
          0.65 *
            Math.abs(
              Math.sin((signalSeed / 600 + i * 13.37) % (Math.PI * 2))
            );
        const id = (d as any).id ?? i;
        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [d.location.longitude, d.location.latitude],
          },
          properties: {
            id,
            matched: !!d.isMatched,
            signal: s,
            hover: hoveredId === id,
          },
        };
      }),
    };
  };

  const updateDonorSource = (immediate = false) => {
    const m = map.current;
    if (!m || !layersAddedRef.current) return;
    const src = m.getSource("donors");
    if (!src) return;
    src.setData(buildDonorFeatures(immediate ? Date.now() : performance.now()));
  };

  // ── Push donors to source whenever they change ────────────────────
  useEffect(() => {
    updateDonorSource(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockDonors]);

  // ── Blink loop: refresh signal/availability props every 700ms ─────
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!useSimulationStore.getState().animations.blink) return;
      updateDonorSource(false);
    }, 700);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── USER MARKER ───────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current || !userLocation) return;
    const coords: [number, number] = [userLocation.longitude, userLocation.latitude];

    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.style.cssText = `
        width:18px;height:18px;border-radius:50%;
        background:radial-gradient(circle,#22d3ee 0%,#0891b2 100%);
        box-shadow:0 0 0 4px rgba(34,211,238,0.25),0 0 18px rgba(34,211,238,0.6);
        border:2px solid #fff;
      `;
      import("mapbox-gl").then(({ default: mapboxgl }) => {
        userMarkerRef.current = new mapboxgl.Marker(el)
          .setLngLat(coords)
          .setPopup(
            new mapboxgl.Popup({ offset: 20 }).setText(
              userRole === "hospital" ? "🏥 Your Hospital" : "🟢 You"
            )
          )
          .addTo(map.current);
      });
    } else {
      userMarkerRef.current.setLngLat(coords);
    }
  }, [userLocation, userRole]);

  // ── EMERGENCY MARKERS + pulse source ──────────────────────────────
  useEffect(() => {
    if (!map.current) return;
    const liveIds = new Set(activeEmergencies.map((e) => e.id));

    emergencyMarkersRef.current.forEach((marker, id) => {
      if (!liveIds.has(id)) {
        marker.remove();
        emergencyMarkersRef.current.delete(id);
      }
    });

    import("mapbox-gl").then(({ default: mapboxgl }) => {
      activeEmergencies.forEach((em) => {
        if (emergencyMarkersRef.current.has(em.id)) return;

        const el = document.createElement("div");
        el.style.cssText = `
          width:24px;height:24px;border-radius:50%;
          background:radial-gradient(circle,#fecaca 0%,#ef4444 70%);
          border:2px solid #fff;
          box-shadow:0 0 14px rgba(239,68,68,0.85);
          display:flex;align-items:center;justify-content:center;
          color:#fff;font-size:9px;font-weight:700;font-family:ui-monospace,monospace;
        `;
        el.textContent = em.blood_group;

        const popup = new mapboxgl.Popup({ offset: 28, closeButton: false })
          .setHTML(
            `<div style="font-family:ui-sans-serif;color:#0f172a">
              <div style="font-weight:700;font-size:13px">${em.blood_group} NEEDED</div>
              <div style="font-size:11px;opacity:.7">${em.units_required} units • ${em.urgency}</div>
            </div>`
          );

        const marker = new mapboxgl.Marker(el)
          .setLngLat([em.location.longitude, em.location.latitude])
          .setPopup(popup)
          .addTo(map.current);

        emergencyMarkersRef.current.set(em.id, marker);
      });

      // Update the pulse source to reflect every active emergency
      const pulseSrc = map.current?.getSource("emergency-pulse");
      if (pulseSrc) {
        pulseSrc.setData({
          type: "FeatureCollection",
          features: activeEmergencies.map((em) => ({
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [em.location.longitude, em.location.latitude],
            },
            properties: { id: em.id },
          })),
        });
      }
    });
  }, [activeEmergencies]);

  // ── HOSPITAL SOURCE UPDATES ───────────────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !layersAddedRef.current) return;
    const src = m.getSource("hospitals");
    if (!src) return;
    src.setData({
      type: "FeatureCollection",
      features: hospitals.map((h) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [h.location.longitude, h.location.latitude],
        },
        properties: {
          id: h.id,
          name: h.name,
          shortName: h.shortName,
          beds: h.beds ?? null,
          bloodBank: h.bloodBank,
        },
      })),
    });
  }, [hospitals]);

  // ── SEARCH RADIUS ─────────────────────────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !m.isStyleLoaded?.()) return;

    const makeCircle = (center: GeoPoint, radiusKm: number) => {
      const dx = radiusKm / (111.32 * Math.cos((center.latitude * Math.PI) / 180));
      const dy = radiusKm / 110.574;
      const coords: number[][] = [];
      for (let i = 0; i <= 64; i++) {
        const t = (i / 64) * 2 * Math.PI;
        coords.push([
          center.longitude + dx * Math.cos(t),
          center.latitude + dy * Math.sin(t),
        ]);
      }
      return coords;
    };

    const geoData = (coords: number[][]): GeoJSON.FeatureCollection => ({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [coords] },
          properties: {},
        },
      ],
    });

    if (searchRadius) {
      const coords = makeCircle(searchRadius.center, searchRadius.radiusKm);
      if (radiusAddedRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (m.getSource("search-radius") as any)?.setData(geoData(coords));
      } else {
        m.addSource("search-radius", { type: "geojson", data: geoData(coords) });
        m.addLayer({
          id: "radius-fill",
          type: "fill",
          source: "search-radius",
          paint: { "fill-color": "#22c55e", "fill-opacity": 0.08 },
        });
        m.addLayer({
          id: "radius-line",
          type: "line",
          source: "search-radius",
          paint: {
            "line-color": "#22c55e",
            "line-width": 2,
            "line-dasharray": [2, 4],
          },
        });
        radiusAddedRef.current = true;
      }
    } else if (radiusAddedRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m.getSource("search-radius") as any)?.setData(geoData([]));
    }
  }, [searchRadius]);

  // ── Helper: ensure route source/layers exist & set data ───────────
  const ensureRouteData = (route: { start: GeoPoint; end: GeoPoint } | null) => {
    const m = map.current;
    if (!m) return;

    const empty: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "LineString", coordinates: [] },
          properties: {},
        },
      ],
    };

    const data: GeoJSON.FeatureCollection = route
      ? {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: [
                  [route.start.longitude, route.start.latitude],
                  [route.end.longitude, route.end.latitude],
                ],
              },
              properties: {},
            },
          ],
        }
      : empty;

    if (!routeAddedRef.current) {
      m.addSource("active-route", { type: "geojson", data });
      // Glow underlay
      m.addLayer({
        id: "route-glow",
        type: "line",
        source: "active-route",
        paint: {
          "line-color": "#ef4444",
          "line-width": 14,
          "line-opacity": 0.18,
          "line-blur": 4,
        },
      });
      // Solid base
      m.addLayer({
        id: "route-line",
        type: "line",
        source: "active-route",
        paint: {
          "line-color": "#ef4444",
          "line-width": 3,
          "line-opacity": 0.85,
        },
      });
      // Animated dashed overlay
      m.addLayer({
        id: "route-line-dashed",
        type: "line",
        source: "active-route",
        paint: {
          "line-color": "#fff",
          "line-width": 2,
          "line-opacity": 0.9,
          "line-dasharray": [2, 4],
        },
      });
      routeAddedRef.current = true;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m.getSource("active-route") as any)?.setData(data);
    }

    if (route) {
      m.fitBounds(
        [
          [route.start.longitude, route.start.latitude],
          [route.end.longitude, route.end.latitude],
        ],
        { padding: 100, duration: 1200 }
      );
    }
  };

  // ── ROUTE LINE (driven by store) ──────────────────────────────────
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded?.()) return;
    ensureRouteData(activeRoute ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoute]);

  return (
    <div ref={mapContainer} style={{ position: "absolute", inset: 0, zIndex: 0 }} />
  );
}

// ── PUBLIC EXPORT — client-only guard + HUD overlay ──────────────────
export function LiveMap({ centerCoords, userRole = "hospital" }: LiveMapProps) {
  const [mounted, setMounted] = useState(false);
  const [latency, setLatency] = useState(28);
  const { mockDonors, activeEmergencies } = useSimulationStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Simulated latency ticker (no backend calls)
  useEffect(() => {
    const id = window.setInterval(() => {
      setLatency((prev) => {
        const next = prev + (Math.random() - 0.5) * 8;
        return Math.max(12, Math.min(120, Math.round(next)));
      });
    }, 900);
    return () => window.clearInterval(id);
  }, []);

  const donorCount = useAnimatedCounter(mockDonors.length || 0);
  const alertCount = useAnimatedCounter(activeEmergencies.length);
  const matchedCount = useAnimatedCounter(
    useMemo(() => mockDonors.filter((d) => d.isMatched).length, [mockDonors])
  );

  const latencyTone =
    latency < 40 ? "text-emerald-400" : latency < 80 ? "text-amber-400" : "text-rose-400";

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden bg-[#05070d]">
      <style>{`
        @keyframes ll-ping { 75%, 100% { transform: scale(2.4); opacity: 0; } }
        @keyframes ll-blink { 0%,100%{opacity:1} 50%{opacity:.35} }
      `}</style>

      {/* Map — MUST be first child, no siblings inside its container */}
      {mounted && <MapInner centerCoords={centerCoords} userRole={userRole} />}

      {/* Loading placeholder */}
      {!mounted && (
        <div className="absolute inset-0 z-[1] flex items-center justify-center text-xs tracking-[0.3em] text-cyan-300/70 font-mono">
          INITIALIZING SPATIAL INTERFACE...
        </div>
      )}

      {/* Subtle grid overlay — pointer-events-none so it doesn't block map interaction */}
      <div
        className="pointer-events-none absolute inset-0 z-[3]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Soft vignette edges */}
      <div
        className="pointer-events-none absolute inset-0 z-[3]"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* HUD — System Diagnostics */}
      <div className="absolute top-4 left-4 z-[5] min-w-[210px] rounded-lg border border-white/10 bg-black/55 backdrop-blur-md p-3 font-mono text-[11px] text-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between mb-2">
          <span className="tracking-[0.25em] text-white/60">SYSTEM</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ONLINE
          </span>
        </div>

        <Row label="Local Nodes" value={donorCount.toString()} />
        <Row label="Active Alerts" value={alertCount.toString()} tone="text-rose-400" />
        <Row label="Matched" value={matchedCount.toString()} tone="text-emerald-400" />
        <Row label="Latency" value={`${latency} ms`} tone={latencyTone} />

        <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
          <span className="text-white/60">AI Matching</span>
          <span className="flex items-center gap-1 text-cyan-300">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
            ACTIVE
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[5] rounded-lg border border-white/10 bg-black/55 backdrop-blur-md p-2.5 font-mono text-[10px] text-white/80 space-y-1">
        <LegendDot color="#22d3ee" label="You / Hospital" />
        <LegendDot color="#0ea5e9" label="Hospitals" />
        <LegendDot color="#ef4444" label="Emergency" />
        <LegendDot color="rgba(148,163,184,0.85)" label="Donors" />
        <LegendDot color="#4ade80" label="Matched" />
      </div>

      {/* Status badge */}
      <div className="absolute top-4 right-16 z-[5] flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 backdrop-blur-md px-3 py-1.5 font-mono text-[10px] text-rose-300">
        <span className="inline-block w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
        LIVE NETWORK
      </div>
    </div>
  );
}

// ── Tiny presentational helpers ──────────────────────────────────────
function Row({
  label,
  value,
  tone = "text-white",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-white/60">{label}</span>
      <span className={`tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
      <span>{label}</span>
    </div>
  );
}