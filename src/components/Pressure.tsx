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
        "https://api.data.amsterdam.nl/v1/meldingen/meldingen?_format=json&hoofdcategorie=Afval&_pageSize=500"
      );
      const data = await res.json();
      const meldingen = data._embedded?.meldingen || [];

      // Aggregate by buurt
      const buurtMap = new Map<string, { open: number; closed: number; coords: [number, number][] }>();

      for (const m of meldingen) {
        const buurt = m.gbdBuurtNaam || "Onbekend";
        if (!buurtMap.has(buurt)) {
          buurtMap.set(buurt, { open: 0, closed: 0, coords: [] });
        }
        const b = buurtMap.get(buurt)!;
        if (m.externeStatus === "Open") b.open++;
        else b.closed++;
        if (m.longitudeVisualisatie && m.latitudeVisualisatie) {
          b.coords.push([m.longitudeVisualisatie, m.latitudeVisualisatie]);
        }
      }

      // Calculate scores and sort
      const spots: Hotspot[] = [];
      buurtMap.forEach((v, k) => {
        if (k === "Onbekend" || v.coords.length === 0) return;
        const score = v.open + 0.25 * v.closed;
        const avgLon = v.coords.reduce((s, c) => s + c[0], 0) / v.coords.length;
        const avgLat = v.coords.reduce((s, c) => s + c[1], 0) / v.coords.length;
        spots.push({
          id: k,
          name: k,
          score: Math.round(score * 10) / 10,
          openCount: v.open,
          closedCount: v.closed,
          center: [avgLon, avgLat],
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
        <h2 className="text-lg font-semibold">Pressure Score</h2>
        <p className="text-sm text-gray-400">Top 20 hotspots per buurt</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-gray-400">Laden...</div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {hotspots.map((h, i) => (
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
                    <p className="text-xs text-gray-500">
                      {h.openCount} open · {h.closedCount} gesloten
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-400">{h.score}</p>
                    <p className="text-xs text-gray-500">score</p>
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
