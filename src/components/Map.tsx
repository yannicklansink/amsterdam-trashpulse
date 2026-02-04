"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Melding, Filters } from "@/types";
import { useMeldingen, type MeldingFeature } from "@/hooks/useMeldingen";

interface MapProps {
  filters: Filters;
  onMeldingClick: (melding: Melding | null) => void;
  selectedMelding: Melding | null;
}

export default function Map({ filters, onMeldingClick, selectedMelding }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Use the shared hook to fetch meldingen as GeoJSON
  const { data: meldingenData } = useMeldingen(filters);

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

      // === OPEN MELDINGEN (RED) - Separate source with clustering ===
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

      // === CLOSED MELDINGEN (GREEN) - Separate source with clustering ===
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

      // === CONTAINERS ===
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

      // === CLICK HANDLERS ===
      const handleMeldingClick = (e: maplibregl.MapLayerMouseEvent) => {
        if (e.features && e.features[0]) {
          const props = e.features[0].properties;
          const geom = e.features[0].geometry;
          if (geom.type === "Point") {
            onMeldingClick({
              id: props?.id || "",
              hoofdcategorie: props?.hoofdcategorie || "",
              subcategorie: props?.subcategorie || "",
              datumMelding: props?.datumMelding || "",
              tijdstipMelding: props?.tijdstipMelding || "",
              externeStatus: props?.externeStatus || "",
              doorlooptijdDagen: props?.doorlooptijdDagen || null,
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
      const handleClusterClick = (sourceId: string) => (e: maplibregl.MapLayerMouseEvent) => {
        if (!map.current || !e.features?.[0]) return;
        const clusterId = e.features[0].properties?.cluster_id;
        const source = map.current.getSource(sourceId) as maplibregl.GeoJSONSource;

        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || !map.current || !e.features?.[0]) return;
          const geom = e.features[0].geometry;
          if (geom.type === "Point") {
            map.current.easeTo({
              center: geom.coordinates as [number, number],
              zoom: zoom ?? 14,
            });
          }
        });
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

  // Fly to selected melding
  useEffect(() => {
    if (!map.current || !selectedMelding) return;
    map.current.flyTo({
      center: selectedMelding.geometry.coordinates,
      zoom: 15,
      duration: 1000,
    });
  }, [selectedMelding]);

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
