"use client";

import { useEffect, useState } from "react";
import type { Hotspot } from "@/types";

interface PressureProps {
  onHotspotClick: (center: [number, number]) => void;
}

export default function Pressure({ onHotspotClick }: PressureProps) {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHotspots();
  }, []);

  async function fetchHotspots() {
    setLoading(true);
    try {
      const res = await fetch(
        "https://api.data.amsterdam.nl/v1/meldingen/meldingen?_format=json&hoofdcategorie=Afval&_pageSize=500&_sort=-datumMelding"
      );
      const data = await res.json();
      const meldingen = data._embedded?.meldingen || [];

      // Aggregate by buurt
      const buurtMap = new Map<string, {
        open: number;
        closed: number;
        coords: [number, number][];
        resolutionDays: number[];
      }>();

      for (const m of meldingen) {
        const buurt = m.gbdBuurtNaam || "Onbekend";
        if (!buurtMap.has(buurt)) {
          buurtMap.set(buurt, { open: 0, closed: 0, coords: [], resolutionDays: [] });
        }
        const b = buurtMap.get(buurt)!;
        if (m.externeStatus === "Open") {
          b.open++;
        } else {
          b.closed++;
          // Track resolution time for closed meldingen
          if (m.doorlooptijdDagen != null && m.doorlooptijdDagen > 0) {
            b.resolutionDays.push(m.doorlooptijdDagen);
          }
        }
        if (m.longitudeVisualisatie && m.latitudeVisualisatie) {
          b.coords.push([m.longitudeVisualisatie, m.latitudeVisualisatie]);
        }
      }

      // Calculate scores and sort
      const spots: Hotspot[] = [];
      buurtMap.forEach((v, k) => {
        if (k === "Onbekend" || v.coords.length === 0) return;
        const total = v.open + v.closed;
        const score = v.open + 0.25 * v.closed;
        const avgLon = v.coords.reduce((s, c) => s + c[0], 0) / v.coords.length;
        const avgLat = v.coords.reduce((s, c) => s + c[1], 0) / v.coords.length;

        // Calculate resolution rate and average resolution time
        const resolutionRate = total > 0 ? Math.round((v.closed / total) * 100) : 0;
        const avgResolutionDays = v.resolutionDays.length > 0
          ? Math.round((v.resolutionDays.reduce((s, d) => s + d, 0) / v.resolutionDays.length) * 10) / 10
          : null;

        spots.push({
          id: k,
          name: k,
          score: Math.round(score * 10) / 10,
          openCount: v.open,
          closedCount: v.closed,
          center: [avgLon, avgLat],
          resolutionRate,
          avgResolutionDays,
        });
      });

      spots.sort((a, b) => b.score - a.score);
      setHotspots(spots.slice(0, 20));
    } catch (err) {
      console.error("Failed to fetch hotspots:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold">Afhandeling per Buurt</h2>
        <p className="text-sm text-gray-400">Percentage opgeloste meldingen</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-gray-400">Laden...</div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {hotspots.map((h, i) => {
              // Color based on resolution rate
              const rateColor = h.resolutionRate >= 80
                ? "text-green-400"
                : h.resolutionRate >= 50
                  ? "text-yellow-400"
                  : "text-red-400";

              const total = h.openCount + h.closedCount;

              return (
                <li
                  key={h.id}
                  onClick={() => onHotspotClick(h.center)}
                  className="p-3 cursor-pointer hover:bg-gray-800 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center text-xs font-bold bg-gray-800 rounded">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{h.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-red-400">{h.openCount} open</span>
                        <span className="text-xs text-gray-600">·</span>
                        <span className="text-xs text-green-400">{h.closedCount} opgelost</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${rateColor}`}>{h.resolutionRate}%</p>
                      <p className="text-xs text-gray-500">{total} totaal</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
