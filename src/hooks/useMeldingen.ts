"use client";

import { useEffect, useState, useCallback } from "react";
import type { Filters } from "@/types";

export interface MeldingFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    id: string;
    hoofdcategorie: string;
    subcategorie: string;
    datumMelding: string;
    tijdstipMelding: string;
    externeStatus: string;
    doorlooptijdDagen: number | null;
    gbdBuurtNaam: string;
    gbdWijkNaam: string;
    gbdStadsdeelNaam: string;
  };
}

export interface MeldingenGeoJSON {
  type: "FeatureCollection";
  features: MeldingFeature[];
}

function getTimeRangeCutoff(timeRange: string): Date {
  const now = new Date();
  switch (timeRange) {
    case "1h":
      return new Date(now.getTime() - 1 * 60 * 60 * 1000);
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

export function useMeldingen(filters: Filters) {
  const [data, setData] = useState<MeldingenGeoJSON>({
    type: "FeatureCollection",
    features: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchMeldingen = useCallback(async () => {
    try {
      // Fetch more data for longer time ranges
      const pageSize = filters.timeRange === "30d" ? "1000" :
                       filters.timeRange === "7d" ? "500" : "200";

      const params = new URLSearchParams({
        _format: "geojson",
        hoofdcategorie: "Afval",
        _pageSize: pageSize,
        _sort: "-datumMelding",
      });

      if (filters.status !== "all") {
        const statusValue = filters.status === "open" ? "Open" : "Afgesloten";
        params.append("externeStatus", statusValue);
      }

      const res = await fetch(
        `https://api.data.amsterdam.nl/v1/meldingen/meldingen?${params}`
      );
      const geojson = await res.json();

      // Filter by time range client-side
      const cutoff = getTimeRangeCutoff(filters.timeRange);
      const filteredFeatures = (geojson.features || []).filter(
        (feature: MeldingFeature) => {
          if (!feature.properties?.datumMelding) return false;
          const date = new Date(
            `${feature.properties.datumMelding}T${feature.properties.tijdstipMelding || "00:00:00"}`
          );
          return date >= cutoff;
        }
      );

      setData({
        type: "FeatureCollection",
        features: filteredFeatures,
      });
    } catch (err) {
      console.error("Failed to fetch meldingen:", err);
    } finally {
      setLoading(false);
    }
  }, [filters.timeRange, filters.status]);

  useEffect(() => {
    setLoading(true);
    fetchMeldingen();
    const interval = setInterval(fetchMeldingen, 30000);
    return () => clearInterval(interval);
  }, [fetchMeldingen]);

  return { data, loading, refetch: fetchMeldingen };
}
