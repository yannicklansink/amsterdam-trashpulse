"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { circle as turfCircle } from "@turf/turf";
import type { Melding, Filters } from "@/types";
import { useMeldingen, type MeldingFeature } from "@/hooks/useMeldingen";

interface MapProps {
  filters: Filters;
  onMeldingClick: (melding: Melding | null) => void;
  selectedMelding: Melding | null;
  selectedHotspot: { center: [number, number]; radiusMeters: number } | null;
}

export default function Map({
  filters,
  onMeldingClick,
  selectedMelding,
  selectedHotspot,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pulseAnimation = useRef<number | null>(null);
  const onMeldingClickRef = useRef(onMeldingClick);

  // Use the shared hook to fetch meldingen as GeoJSON
  const { data: meldingenData } = useMeldingen(filters);

  useEffect(() => {
    onMeldingClickRef.current = onMeldingClick;
  }, [onMeldingClick]);

  // Split data into open and closed
  const { openData, closedData } = useMemo(() => {
    const open: MeldingFeature[] = [];
    const closed: MeldingFeature[] = [];

    for (const feature of meldingenData.features) {
      if (feature.properties.externeStatus === "Open") {
        open.push(feature);
      } else {
        closed.push(feature);
      }
    }

    return {
      openData: { type: "FeatureCollection" as const, features: open },
      closedData: { type: "FeatureCollection" as const, features: closed },
    };
  }, [meldingenData]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [4.9041, 52.3676], // Amsterdam
      zoom: 12,
    });

    // Add zoom and rotation controls
    map.current.addControl(
      new maplibregl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true,
      }),
      "top-right"
    );

    map.current.on("load", () => {
      if (!map.current) return;

      // === CONTAINERS (added first so they render below meldingen) ===
      map.current.addSource("containers", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.current.addLayer({
        id: "containers",
        type: "circle",
        source: "containers",
        paint: {
          "circle-radius": 4,
          "circle-color": [
            "match",
            ["get", "fractieOmschrijving"],
            "Rest", "#6b7280",
            "Papier", "#3b82f6",
            "Glas", "#10b981",
            "Textiel", "#8b5cf6",
            "Plastic", "#f59e0b",
            "#6b7280"
          ],
          "circle-opacity": 0.7,
        },
      });

      // === SELECTED HOTSPOT AREA (below meldingen) ===
      map.current.addSource("selected-hotspot", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.current.addLayer({
        id: "selected-hotspot-fill",
        type: "fill",
        source: "selected-hotspot",
        paint: {
          "fill-color": "#f97316",
          "fill-opacity": 0.15,
        },
      });

      map.current.addLayer({
        id: "selected-hotspot-outline",
        type: "line",
        source: "selected-hotspot",
        paint: {
          "line-color": "#f97316",
          "line-width": 2,
          "line-opacity": 0.9,
        },
      });

      // === CLOSED MELDINGEN (GREEN) - added before open so open appears on top ===
      map.current.addSource("meldingen-closed", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 40,
      });

      // Closed clusters (green)
      map.current.addLayer({
        id: "meldingen-closed-clusters",
        type: "circle",
        source: "meldingen-closed",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#22c55e",
          "circle-radius": [
            "step",
            ["get", "point_count"],
            12, 5, 16, 20, 20,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Closed cluster count
      map.current.addLayer({
        id: "meldingen-closed-cluster-count",
        type: "symbol",
        source: "meldingen-closed",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 11,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Closed unclustered points
      map.current.addLayer({
        id: "meldingen-closed-points",
        type: "circle",
        source: "meldingen-closed",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            10, 3,
            15, 6
          ],
          "circle-color": "#22c55e",
          "circle-opacity": 0.8,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });

      // === OPEN MELDINGEN (RED) - added last so they appear on top ===
      map.current.addSource("meldingen-open", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 40,
      });

      // Open clusters (red)
      map.current.addLayer({
        id: "meldingen-open-clusters",
        type: "circle",
        source: "meldingen-open",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#ef4444",
          "circle-radius": [
            "step",
            ["get", "point_count"],
            12, 5, 16, 20, 20,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Open cluster count
      map.current.addLayer({
        id: "meldingen-open-cluster-count",
        type: "symbol",
        source: "meldingen-open",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 11,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Open unclustered points
      map.current.addLayer({
        id: "meldingen-open-points",
        type: "circle",
        source: "meldingen-open",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            10, 4,
            15, 8
          ],
          "circle-color": "#ef4444",
          "circle-opacity": 0.9,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });

      // === SELECTED MELDING HIGHLIGHT (added last so it appears on top) ===
      map.current.addSource("selected-melding", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Outer pulsing ring
      map.current.addLayer({
        id: "selected-melding-pulse",
        type: "circle",
        source: "selected-melding",
        paint: {
          "circle-radius": 25,
          "circle-color": "transparent",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#fbbf24",
          "circle-stroke-opacity": 0.8,
        },
      });

      // Inner highlight circle
      map.current.addLayer({
        id: "selected-melding-highlight",
        type: "circle",
        source: "selected-melding",
        paint: {
          "circle-radius": 12,
          "circle-color": "#fbbf24",
          "circle-opacity": 0.4,
          "circle-stroke-width": 3,
          "circle-stroke-color": "#fbbf24",
        },
      });

      // === CLICK HANDLERS ===
      const handleMeldingClick = (e: maplibregl.MapLayerMouseEvent) => {
        if (e.features && e.features[0]) {
          const props = e.features[0].properties;
          const geom = e.features[0].geometry;
          if (geom.type === "Point") {
            onMeldingClickRef.current({
              id: props?.id || "",
              meldingsnummer: props?.meldingsnummer || "",
              hoofdcategorie: props?.hoofdcategorie || "",
              subcategorie: props?.subcategorie || "",
              thema: props?.thema || "",
              directie: props?.directie || "",
              regie: props?.regie || "",
              datumMelding: props?.datumMelding || "",
              tijdstipMelding: props?.tijdstipMelding || "",
              datumOverlast: props?.datumOverlast || null,
              tijdstipOverlast: props?.tijdstipOverlast || null,
              datumAfgerond: props?.datumAfgerond || null,
              tijdstipAfgerond: props?.tijdstipAfgerond || null,
              uitersteAfhandeldatum: props?.uitersteAfhandeldatum || null,
              afhandeltermijn: props?.afhandeltermijn || null,
              status: props?.status || "",
              externeStatus: props?.externeStatus || "",
              kpiAfhandeltijd: props?.kpiAfhandeltijd || null,
              doorlooptijdDagen: props?.doorlooptijdDagen || null,
              werkelijkeDoorlooptijdDagen: props?.werkelijkeDoorlooptijdDagen || null,
              anoniemGemeld: props?.anoniemGemeld || null,
              terugkoppelingMelderTevreden: props?.terugkoppelingMelderTevreden || null,
              terugkoppelingMelder: props?.terugkoppelingMelder || null,
              meldingType: props?.meldingType || null,
              meldingSoort: props?.meldingSoort || null,
              buurtNaam: props?.gbdBuurtNaam || "",
              wijkNaam: props?.gbdWijkNaam || "",
              stadsdeelNaam: props?.gbdStadsdeelNaam || "",
              geometry: {
                type: "Point",
                coordinates: geom.coordinates as [number, number],
              },
            });
          }
        }
      };

      map.current.on("click", "meldingen-open-points", handleMeldingClick);
      map.current.on("click", "meldingen-closed-points", handleMeldingClick);

      // Click on cluster to zoom in
      const handleClusterClick = (sourceId: string) => async (e: maplibregl.MapLayerMouseEvent) => {
        if (!map.current || !e.features?.[0]) return;
        const clusterId = e.features[0].properties?.cluster_id;
        const source = map.current.getSource(sourceId) as maplibregl.GeoJSONSource;

        try {
          const zoom = await source.getClusterExpansionZoom(clusterId);
          if (!map.current || !e.features?.[0]) return;
          const geom = e.features[0].geometry;
          if (geom.type === "Point") {
            map.current.easeTo({
              center: geom.coordinates as [number, number],
              zoom: zoom ?? 14,
            });
          }
        } catch {
          // Ignore cluster expansion errors
        }
      };

      map.current.on("click", "meldingen-open-clusters", handleClusterClick("meldingen-open"));
      map.current.on("click", "meldingen-closed-clusters", handleClusterClick("meldingen-closed"));

      // Cursor changes
      const layers = [
        "meldingen-open-clusters", "meldingen-open-points",
        "meldingen-closed-clusters", "meldingen-closed-points"
      ];
      for (const layer of layers) {
        map.current.on("mouseenter", layer, () => {
          if (map.current) map.current.getCanvas().style.cursor = "pointer";
        });
        map.current.on("mouseleave", layer, () => {
          if (map.current) map.current.getCanvas().style.cursor = "";
        });
      }

      setLoaded(true);
      loadContainers();
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update open meldingen data
  useEffect(() => {
    if (!map.current || !loaded) return;
    const source = map.current.getSource("meldingen-open") as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(openData as GeoJSON.FeatureCollection);
    }
  }, [openData, loaded]);

  // Update closed meldingen data
  useEffect(() => {
    if (!map.current || !loaded) return;
    const source = map.current.getSource("meldingen-closed") as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(closedData as GeoJSON.FeatureCollection);
    }
  }, [closedData, loaded]);

  // Update layer visibility based on status filter
  useEffect(() => {
    if (!map.current || !loaded) return;

    const showOpen = filters.status === "all" || filters.status === "open";
    const showClosed = filters.status === "all" || filters.status === "afgesloten";

    const openLayers = ["meldingen-open-clusters", "meldingen-open-cluster-count", "meldingen-open-points"];
    const closedLayers = ["meldingen-closed-clusters", "meldingen-closed-cluster-count", "meldingen-closed-points"];

    for (const layer of openLayers) {
      map.current.setLayoutProperty(layer, "visibility", showOpen ? "visible" : "none");
    }
    for (const layer of closedLayers) {
      map.current.setLayoutProperty(layer, "visibility", showClosed ? "visible" : "none");
    }
  }, [filters.status, loaded]);

  // Update containers visibility
  useEffect(() => {
    if (!map.current || !loaded) return;
    map.current.setLayoutProperty(
      "containers",
      "visibility",
      filters.showContainers ? "visible" : "none"
    );
  }, [filters.showContainers, loaded]);

  // Fly to selected melding and show highlight with pulse animation
  useEffect(() => {
    if (!map.current || !loaded) return;

    const source = map.current.getSource("selected-melding") as maplibregl.GeoJSONSource;
    if (!source) return;

    // Cancel any existing animation
    if (pulseAnimation.current) {
      cancelAnimationFrame(pulseAnimation.current);
      pulseAnimation.current = null;
    }

    if (selectedMelding && selectedMelding.id !== "hotspot" && selectedMelding.geometry) {
      // Update highlight position
      source.setData({
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          geometry: selectedMelding.geometry,
          properties: {},
        }],
      });

      // Start pulse animation
      let start: number | null = null;
      const animatePulse = (timestamp: number) => {
        if (!map.current) return;
        if (!start) start = timestamp;
        const elapsed = timestamp - start;

        // Pulse between radius 20 and 35 over 1.5 seconds
        const progress = (elapsed % 1500) / 1500;
        const radius = 20 + Math.sin(progress * Math.PI * 2) * 7.5;
        const opacity = 0.9 - Math.sin(progress * Math.PI * 2) * 0.4;

        try {
          map.current.setPaintProperty("selected-melding-pulse", "circle-radius", radius);
          map.current.setPaintProperty("selected-melding-pulse", "circle-stroke-opacity", opacity);
        } catch {
          // Layer might not exist yet
        }

        pulseAnimation.current = requestAnimationFrame(animatePulse);
      };

      pulseAnimation.current = requestAnimationFrame(animatePulse);

      // Fly to location
      map.current.flyTo({
        center: selectedMelding.geometry.coordinates,
        zoom: 15,
        duration: 1000,
      });
    } else {
      // Clear highlight when no melding is selected
      source.setData({
        type: "FeatureCollection",
        features: [],
      });
    }

    return () => {
      if (pulseAnimation.current) {
        cancelAnimationFrame(pulseAnimation.current);
        pulseAnimation.current = null;
      }
    };
  }, [selectedMelding, loaded]);

  // Draw a circular area around the selected hotspot
  useEffect(() => {
    if (!map.current || !loaded) return;
    const source = map.current.getSource("selected-hotspot") as maplibregl.GeoJSONSource;
    if (!source) return;

    if (selectedHotspot) {
      const radiusKm = selectedHotspot.radiusMeters / 1000;
      const circle = turfCircle(selectedHotspot.center, radiusKm, {
        steps: 64,
        units: "kilometers",
      });
      source.setData(circle as GeoJSON.Feature);
      map.current.flyTo({
        center: selectedHotspot.center,
        zoom: 13,
        duration: 800,
      });
    } else {
      source.setData({ type: "FeatureCollection", features: [] });
    }
  }, [selectedHotspot, loaded]);

  async function loadContainers() {
    try {
      const res = await fetch(
        "https://api.data.amsterdam.nl/v1/huishoudelijkafval/container?_format=geojson&_pageSize=1000"
      );
      const data = await res.json();
      if (map.current && map.current.getSource("containers")) {
        (map.current.getSource("containers") as maplibregl.GeoJSONSource).setData(data);
      }
    } catch (err) {
      console.error("Failed to load containers:", err);
    }
  }

  return (
    <div ref={mapContainer} className="w-full h-full" />
  );
}
