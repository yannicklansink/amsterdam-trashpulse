"use client";

import { useEffect, useState } from "react";

interface StadsdeelStats {
  name: string;
  openCount: number;
  overTimePercent: number;
  medianDoorlooptijd: number;
}

export default function Backlog() {
  const [stats, setStats] = useState<StadsdeelStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch(
        "https://api.data.amsterdam.nl/v1/meldingen/meldingen?_format=json&hoofdcategorie=Afval&externeStatus=Open&_pageSize=500"
      );
      const data = await res.json();
      const meldingen = data._embedded?.meldingen || [];

      // Aggregate by stadsdeel
      const stadsdeelMap = new Map<string, { open: number; overTime: number; doorlooptijden: number[] }>();

      for (const m of meldingen) {
        const sd = m.gbdStadsdeelNaam || "Onbekend";
        if (!stadsdeelMap.has(sd)) {
          stadsdeelMap.set(sd, { open: 0, overTime: 0, doorlooptijden: [] });
        }
        const s = stadsdeelMap.get(sd)!;
        s.open++;
        if (m.kpiAfhandeltijd === "over tijd" || m.kpiAfhandeltijd === "over_tijd" || m.kpiAfhandeltijd === "Over tijd") {
          s.overTime++;
        }
        if (m.doorlooptijdDagen !== null && m.doorlooptijdDagen !== undefined) {
          s.doorlooptijden.push(m.doorlooptijdDagen);
        }
      }

      const results: StadsdeelStats[] = [];
      stadsdeelMap.forEach((v, k) => {
        if (k === "Onbekend") return;
        const sorted = v.doorlooptijden.sort((a, b) => a - b);
        const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
        results.push({
          name: k,
          openCount: v.open,
          overTimePercent: v.open > 0 ? Math.round((v.overTime / v.open) * 100) : 0,
          medianDoorlooptijd: Math.round(median),
        });
      });

      results.sort((a, b) => b.openCount - a.openCount);
      setStats(results);
    } catch (err) {
      console.error("Failed to fetch backlog stats:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold">Backlog</h2>
        <p className="text-sm text-gray-400">Open meldingen per stadsdeel</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-gray-400">Laden...</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {stats.map((s) => (
              <div key={s.name} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{s.name}</h3>
                  <span className="text-2xl font-bold text-red-400">{s.openCount}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Over tijd</p>
                    <p className={s.overTimePercent > 30 ? "text-red-400" : "text-gray-300"}>
                      {s.overTimePercent}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Mediaan doorloop</p>
                    <p>{s.medianDoorlooptijd} dagen</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
