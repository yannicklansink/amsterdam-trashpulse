"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Melding, Filters } from "@/types";
import { useMeldingen, type MeldingenGeoJSON } from "@/hooks/useMeldingen";

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

      // Add meldingen GeoJSON source (empty initially)
      map.current.addSource("meldingen", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Meldingen layer - open (red)
      map.current.addLayer({
        id: "meldingen-open",
        type: "circle",
        source: "meldingen",
        filter: ["==", ["get", "externeStatus"], "Open"],
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
        filter: ["==", ["get", "externeStatus"], "Afgesloten"],
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

      map.current.on("click", "meldingen-open", handleMeldingClick);
      map.current.on("click", "meldingen-closed", handleMeldingClick);

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

  // Update meldingen data when it changes
  useEffect(() => {
    if (!map.current || !loaded) return;

    const source = map.current.getSource("meldingen") as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(meldingenData as unknown as GeoJSON.FeatureCollection);
    }
  }, [meldingenData, loaded]);

  // Update layer visibility based on status filter
  useEffect(() => {
    if (!map.current || !loaded) return;

    const showOpen = filters.status === "all" || filters.status === "open";
    const showClosed = filters.status === "all" || filters.status === "afgesloten";

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
