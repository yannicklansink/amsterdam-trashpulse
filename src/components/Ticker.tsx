"use client";

import { useEffect, useState } from "react";
import type { Melding, Filters } from "@/types";

interface TickerProps {
  filters: Filters;
  onMeldingClick: (melding: Melding) => void;
  selectedMelding: Melding | null;
}

export default function Ticker({ filters, onMeldingClick, selectedMelding }: TickerProps) {
  const [meldingen, setMeldingen] = useState<Melding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeldingen();
    const interval = setInterval(fetchMeldingen, 30000);
    return () => clearInterval(interval);
  }, [filters]);

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

  async function fetchMeldingen() {
    setLoading(true);
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
        hoofdcategorie: m.hoofdcategorie as string,
        subcategorie: m.subcategorie as string,
        datumMelding: m.datumMelding as string,
        tijdstipMelding: m.tijdstipMelding as string,
        externeStatus: m.externeStatus as string,
        doorlooptijdDagen: m.doorlooptijdDagen as number | null,
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
    }
  }

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
        <h2 className="text-lg font-semibold">Live Feed</h2>
        <p className="text-sm text-gray-400">
          {meldingen.length} meldingen ({getTimeRangeLabel(filters.timeRange)})
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && meldingen.length === 0 ? (
          <div className="p-4 text-gray-400">Laden...</div>
        ) : (
          <ul className="divide-y divide-gray-800">
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
