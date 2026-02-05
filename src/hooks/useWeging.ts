"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { Filters } from "@/types";

const DEBOUNCE_DELAY = 300;

// Fractie kleuren (consistent met container markers)
export const FRACTIE_COLORS: Record<string, string> = {
  "Rest": "#6b7280",
  "Papier": "#3b82f6",
  "Glas": "#10b981",
  "Textiel": "#8b5cf6",
  "Plastic": "#f59e0b",
};

export interface FractieWeight {
  fractie: string;
  totalWeight: number;
  count: number;
  percentage: number;
  color: string;
}

export interface BuurtWeight {
  buurtNaam: string;
  totalWeight: number; // kg
  count: number; // aantal ophaalacties
  center: [number, number];
}

export interface RecentWeging {
  id: string;
  time: string; // "08:30"
  kenteken: string;
  weight: number; // kg
  location: string;
  coordinates: [number, number];
  fractie: string;
}

export interface WegingData {
  buurtTotals: BuurtWeight[];
  recentWegingen: RecentWeging[];
  fractieTotals: FractieWeight[];
  trend: {
    currentTotal: number;
    previousTotal: number;
    percentageChange: number;
  };
  loading: boolean;
}

function getTimeRangeDates(timeRange: string): { current: Date; previous: Date } {
  const now = new Date();
  let currentCutoff: Date;
  let previousCutoff: Date;

  switch (timeRange) {
    case "1h":
      currentCutoff = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      previousCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      break;
    case "24h":
      currentCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      previousCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      break;
    case "7d":
      currentCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      previousCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      currentCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      previousCutoff = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      break;
    default:
      currentCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      previousCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  }

  return { current: currentCutoff, previous: previousCutoff };
}

interface ApiWeging {
  id: string;
  datumWeging: string;
  tijdstipWeging: string;
  nettoGewicht: number;
  fractieOmschrijving: string;
  gbdBuurtNaam: string;
  wegingKenteken: string;
  geometrie?: {
    type: string;
    coordinates: [number, number];
  };
}

export function useWeging(filters: Filters) {
  const [data, setData] = useState<WegingData>({
    buurtTotals: [],
    recentWegingen: [],
    fractieTotals: [],
    trend: { currentTotal: 0, previousTotal: 0, percentageChange: 0 },
    loading: true,
  });
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchWeging = useCallback(async () => {
    try {
      const pageSize = filters.timeRange === "30d" ? "1000" :
                       filters.timeRange === "7d" ? "500" : "200";

      const res = await fetch(
        `https://api.data.amsterdam.nl/v1/huishoudelijkafval/weging?_format=json&_pageSize=${pageSize}&_sort=-datumWeging,-tijdstipWeging`
      );
      const json = await res.json();
      const wegingen: ApiWeging[] = json._embedded?.weging || [];

      const now = new Date();
      const { current: currentCutoff, previous: previousCutoff } = getTimeRangeDates(filters.timeRange);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Filter and process data
      const buurtMap = new Map<string, { weight: number; count: number; coords: [number, number][] }>();
      const fractieMap = new Map<string, { weight: number; count: number }>();
      let currentTotal = 0;
      let previousTotal = 0;
      const recent: RecentWeging[] = [];

      for (const w of wegingen) {
        if (!w.datumWeging || !w.nettoGewicht) continue;

        const date = new Date(`${w.datumWeging}T${w.tijdstipWeging || "00:00:00"}`);
        const weightKg = w.nettoGewicht / 1000;

        // Current period
        if (date >= currentCutoff) {
          currentTotal += weightKg;

          // Aggregate by buurt
          if (w.gbdBuurtNaam && w.geometrie?.coordinates) {
            const existing = buurtMap.get(w.gbdBuurtNaam);
            if (existing) {
              existing.weight += weightKg;
              existing.count += 1;
              existing.coords.push(w.geometrie.coordinates);
            } else {
              buurtMap.set(w.gbdBuurtNaam, {
                weight: weightKg,
                count: 1,
                coords: [w.geometrie.coordinates],
              });
            }
          }

          // Aggregate by fractie
          if (w.fractieOmschrijving) {
            const existing = fractieMap.get(w.fractieOmschrijving);
            if (existing) {
              existing.weight += weightKg;
              existing.count += 1;
            } else {
              fractieMap.set(w.fractieOmschrijving, { weight: weightKg, count: 1 });
            }
          }

          // Recent wegingen (last hour) for live tracker
          if (date >= oneHourAgo && w.geometrie?.coordinates) {
            recent.push({
              id: w.id,
              time: w.tijdstipWeging?.slice(0, 5) || "",
              kenteken: w.wegingKenteken || "Onbekend",
              weight: weightKg,
              location: w.gbdBuurtNaam || "Onbekend",
              coordinates: w.geometrie.coordinates,
              fractie: w.fractieOmschrijving || "Onbekend",
            });
          }
        }
        // Previous period (for trend)
        else if (date >= previousCutoff && date < currentCutoff) {
          previousTotal += weightKg;
        }
      }

      // Convert buurt map to sorted array
      const buurtTotals: BuurtWeight[] = [];
      buurtMap.forEach((v, k) => {
        const avgLon = v.coords.reduce((s, c) => s + c[0], 0) / v.coords.length;
        const avgLat = v.coords.reduce((s, c) => s + c[1], 0) / v.coords.length;
        buurtTotals.push({
          buurtNaam: k,
          totalWeight: Math.round(v.weight * 10) / 10,
          count: v.count,
          center: [avgLon, avgLat],
        });
      });

      buurtTotals.sort((a, b) => b.totalWeight - a.totalWeight);

      // Convert fractie map to sorted array with percentages
      const fractieTotals: FractieWeight[] = [];
      fractieMap.forEach((v, k) => {
        fractieTotals.push({
          fractie: k,
          totalWeight: Math.round(v.weight * 10) / 10,
          count: v.count,
          percentage: currentTotal > 0 ? Math.round((v.weight / currentTotal) * 100) : 0,
          color: FRACTIE_COLORS[k] || "#9ca3af",
        });
      });
      fractieTotals.sort((a, b) => b.totalWeight - a.totalWeight);

      // Calculate trend percentage
      const percentageChange = previousTotal > 0
        ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
        : 0;

      setData({
        buurtTotals: buurtTotals.slice(0, 15),
        recentWegingen: recent.slice(0, 10),
        fractieTotals,
        trend: {
          currentTotal: Math.round(currentTotal),
          previousTotal: Math.round(previousTotal),
          percentageChange,
        },
        loading: false,
      });
    } catch (err) {
      console.error("Failed to fetch weging data:", err);
      setData(prev => ({ ...prev, loading: false }));
    }
  }, [filters.timeRange]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    setData(prev => ({ ...prev, loading: true }));

    debounceRef.current = setTimeout(() => {
      fetchWeging();
      intervalRef.current = setInterval(fetchWeging, 30000);
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchWeging]);

  return data;
}
