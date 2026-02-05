"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { Melding, Filters } from "@/types";

const DEBOUNCE_DELAY = 300;

interface TickerProps {
  filters: Filters;
  onMeldingClick: (melding: Melding) => void;
  selectedMelding: Melding | null;
}

// Skeleton component for loading state
function SkeletonItem() {
  return (
    <li className="p-3 animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-800 rounded w-1/2" />
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="h-5 bg-gray-700 rounded w-16" />
          <div className="h-3 bg-gray-800 rounded w-12" />
        </div>
      </div>
    </li>
  );
}

export default function Ticker({ filters, onMeldingClick, selectedMelding }: TickerProps) {
  const [meldingen, setMeldingen] = useState<Melding[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasDataRef = useRef(false);

  useEffect(() => {
    hasDataRef.current = meldingen.length > 0;
  }, [meldingen.length]);

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

  const fetchMeldingen = useCallback(async () => {
    try {
      // Fetch more data for longer time ranges
      const pageSize = filters.timeRange === "30d" ? "200" : filters.timeRange === "7d" ? "100" : "50";

      const params = new URLSearchParams({
        _format: "json",
        hoofdcategorie: "Afval",
        _pageSize: pageSize,
        _sort: "-datumMelding",
      });

      if (filters.status !== "all") {
        // API uses capitalized status values
        const statusValue = filters.status === "open" ? "Open" : "Afgesloten";
        params.append("externeStatus", statusValue);
      }

      const res = await fetch(
        `https://api.data.amsterdam.nl/v1/meldingen/meldingen?${params}`
      );
      const data = await res.json();

      const cutoff = getTimeRangeCutoff(filters.timeRange);

      const mapped: Melding[] = (data._embedded?.meldingen || []).map((m: Record<string, unknown>) => ({
        id: m.id as string,
        meldingsnummer: (m.meldingsnummer as string) || "",
        hoofdcategorie: m.hoofdcategorie as string,
        subcategorie: m.subcategorie as string,
        thema: (m.thema as string) || "",
        directie: (m.directie as string) || "",
        regie: (m.regie as string) || "",
        datumMelding: m.datumMelding as string,
        tijdstipMelding: m.tijdstipMelding as string,
        datumOverlast: (m.datumOverlast as string) || null,
        tijdstipOverlast: (m.tijdstipOverlast as string) || null,
        datumAfgerond: (m.datumAfgerond as string) || null,
        tijdstipAfgerond: (m.tijdstipAfgerond as string) || null,
        uitersteAfhandeldatum: (m.uitersteAfhandeldatum as string) || null,
        afhandeltermijn: (m.afhandeltermijn as number) || null,
        status: (m.status as string) || "",
        externeStatus: m.externeStatus as string,
        kpiAfhandeltijd: (m.kpiAfhandeltijd as string) || null,
        doorlooptijdDagen: m.doorlooptijdDagen as number | null,
        werkelijkeDoorlooptijdDagen: (m.werkelijkeDoorlooptijdDagen as number) || null,
        anoniemGemeld: (m.anoniemGemeld as string) || null,
        terugkoppelingMelderTevreden: (m.terugkoppelingMelderTevreden as string) || null,
        terugkoppelingMelder: (m.terugkoppelingMelder as string) || null,
        meldingType: (m.meldingType as string) || null,
        meldingSoort: (m.meldingSoort as string) || null,
        buurtNaam: m.gbdBuurtNaam as string,
        wijkNaam: m.gbdWijkNaam as string,
        stadsdeelNaam: m.gbdStadsdeelNaam as string,
        geometry: m.longitudeVisualisatie && m.latitudeVisualisatie
          ? { type: "Point" as const, coordinates: [m.longitudeVisualisatie as number, m.latitudeVisualisatie as number] }
          : null,
      }))
      .filter((m: Melding) => m.geometry !== null)
      .filter((m: Melding) => {
        // Filter by time range
        const meldingDate = new Date(`${m.datumMelding}T${m.tijdstipMelding || "00:00:00"}`);
        return meldingDate >= cutoff;
      });

      // Sort by full datetime (date + time) descending - newest first
      mapped.sort((a, b) => {
        const dateA = new Date(`${a.datumMelding}T${a.tijdstipMelding || "00:00:00"}`);
        const dateB = new Date(`${b.datumMelding}T${b.tijdstipMelding || "00:00:00"}`);
        return dateB.getTime() - dateA.getTime();
      });

      setMeldingen(mapped);
    } catch (err) {
      console.error("Failed to fetch meldingen:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [filters.status, filters.timeRange]);

  useEffect(() => {
    // Clear previous debounce and interval
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Show refreshing indicator if we have data, loading if not
    if (hasDataRef.current) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    // Debounce the fetch call
    debounceRef.current = setTimeout(() => {
      fetchMeldingen();
      // Set up refresh interval after initial fetch
      intervalRef.current = setInterval(fetchMeldingen, 30000);
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [filters.timeRange, filters.status, fetchMeldingen]);

  function formatTime(date: string, time: string) {
    if (!date) return "";
    const d = new Date(`${date}T${time || "00:00:00"}`);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours > 0) return `${hours}u geleden`;
    return "zojuist";
  }

  function getTimeRangeLabel(timeRange: string): string {
    switch (timeRange) {
      case "1h": return "laatste uur";
      case "24h": return "laatste 24 uur";
      case "7d": return "laatste 7 dagen";
      case "30d": return "laatste 30 dagen";
      default: return "laatste 24 uur";
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Live Feed</h2>
          {isRefreshing && (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        <p className="text-sm text-gray-400">
          {loading ? "Laden..." : `${meldingen.length} meldingen (${getTimeRangeLabel(filters.timeRange)})`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && meldingen.length === 0 ? (
          // Show skeleton while initial loading
          <ul className="divide-y divide-gray-800">
            {[...Array(8)].map((_, i) => (
              <SkeletonItem key={i} />
            ))}
          </ul>
        ) : meldingen.length === 0 ? (
          <div className="p-4 text-gray-400 text-center">
            Geen meldingen gevonden in deze periode
          </div>
        ) : (
          <ul className={`divide-y divide-gray-800 ${isRefreshing ? "opacity-60" : ""}`}>
            {meldingen.map((m) => (
              <li
                key={m.id}
                onClick={() => m.geometry && onMeldingClick(m)}
                className={`p-3 cursor-pointer hover:bg-gray-800 transition ${
                  selectedMelding?.id === m.id ? "bg-gray-800" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {m.subcategorie || m.hoofdcategorie}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {m.buurtNaam || m.wijkNaam || m.stadsdeelNaam}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        m.externeStatus === "Open"
                          ? "bg-red-900 text-red-200"
                          : "bg-green-900 text-green-200"
                      }`}
                    >
                      {m.externeStatus}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(m.datumMelding, m.tijdstipMelding)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
