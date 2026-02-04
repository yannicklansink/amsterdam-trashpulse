"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Melding, Filters } from "@/types";

interface MapProps {
  filters: Filters;
  onMeldingClick: (melding: Melding | null) => void;
  selectedMelding: Melding | null;
}

export default function Map({ filters, onMeldingClick, selectedMelding }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

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

    map.current.on("load", () => {
      if (!map.current) return;

      // Add meldingen MVT source
      map.current.addSource("meldingen", {
        type: "vector",
        url: "https://api.data.amsterdam.nl/v1/mvt/meldingen/tilejson.json",
      });

      // Meldingen layer - open (red)
      map.current.addLayer({
        id: "meldingen-open",
        type: "circle",
        source: "meldingen",
        "source-layer": "meldingen",
        filter: ["all",
          ["==", ["get", "hoofdcategorie"], "Afval"],
          ["==", ["get", "externeStatus"], "open"]
        ],
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            10, 3,
            15, 8
          ],
          "circle-color": "#ef4444",
          "circle-opacity": 0.8,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Meldingen layer - closed (green)
      map.current.addLayer({
        id: "meldingen-closed",
        type: "circle",
        source: "meldingen",
        "source-layer": "meldingen",
        filter: ["all",
          ["==", ["get", "hoofdcategorie"], "Afval"],
          ["==", ["get", "externeStatus"], "afgesloten"]
        ],
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            10, 2,
            15, 6
          ],
          "circle-color": "#22c55e",
          "circle-opacity": 0.6,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Add containers source
      map.current.addSource("containers", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Container layer
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

      // Click handler for meldingen
      map.current.on("click", "meldingen-open", (e) => {
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
              buurtNaam: props?.buurtNaam || "",
              wijkNaam: props?.wijkNaam || "",
              stadsdeelNaam: props?.stadsdeelNaam || "",
              geometry: {
                type: "Point",
                coordinates: geom.coordinates as [number, number],
              },
            });
          }
        }
      });

      map.current.on("click", "meldingen-closed", (e) => {
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
              buurtNaam: props?.buurtNaam || "",
              wijkNaam: props?.wijkNaam || "",
              stadsdeelNaam: props?.stadsdeelNaam || "",
              geometry: {
                type: "Point",
                coordinates: geom.coordinates as [number, number],
              },
            });
          }
        }
      });

      // Cursor change on hover
      map.current.on("mouseenter", "meldingen-open", () => {
        if (map.current) map.current.getCanvas().style.cursor = "pointer";
      });
      map.current.on("mouseleave", "meldingen-open", () => {
        if (map.current) map.current.getCanvas().style.cursor = "";
      });
      map.current.on("mouseenter", "meldingen-closed", () => {
        if (map.current) map.current.getCanvas().style.cursor = "pointer";
      });
      map.current.on("mouseleave", "meldingen-closed", () => {
        if (map.current) map.current.getCanvas().style.cursor = "";
      });

      setLoaded(true);
      loadContainers();
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  function getTimeRangeCutoffDate(timeRange: string): string {
    const now = new Date();
    let cutoff: Date;
    switch (timeRange) {
      case "1h":
        cutoff = new Date(now.getTime() - 1 * 60 * 60 * 1000);
        break;
      case "24h":
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    return cutoff.toISOString().split("T")[0]; // Return YYYY-MM-DD format
  }

  // Update layer visibility and filters based on filters
  useEffect(() => {
    if (!map.current || !loaded) return;

    const showOpen = filters.status === "all" || filters.status === "open";
    const showClosed = filters.status === "all" || filters.status === "afgesloten";
    const cutoffDate = getTimeRangeCutoffDate(filters.timeRange);

    // Update open layer filter with time range
    map.current.setFilter("meldingen-open", ["all",
      ["==", ["get", "hoofdcategorie"], "Afval"],
      ["==", ["get", "externeStatus"], "open"],
      [">=", ["get", "datumMelding"], cutoffDate]
    ]);

    // Update closed layer filter with time range
    map.current.setFilter("meldingen-closed", ["all",
      ["==", ["get", "hoofdcategorie"], "Afval"],
      ["==", ["get", "externeStatus"], "afgesloten"],
      [">=", ["get", "datumMelding"], cutoffDate]
    ]);

    map.current.setLayoutProperty(
      "meldingen-open",
      "visibility",
      showOpen ? "visible" : "none"
    );
    map.current.setLayoutProperty(
      "meldingen-closed",
      "visibility",
      showClosed ? "visible" : "none"
    );
  }, [filters.status, filters.timeRange, loaded]);

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
