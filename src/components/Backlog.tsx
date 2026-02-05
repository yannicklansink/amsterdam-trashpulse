"use client";

import { useEffect, useState } from "react";

// Threshold: meldingen open > 5 dagen worden als "over tijd" beschouwd
const OVER_TIME_THRESHOLD_DAYS = 5;

interface StadsdeelStats {
  name: string;
  openCount: number;
  overTimeCount: number;
  overTimePercent: number;
  medianDagenOpen: number;
}

function calculateDaysOpen(datumMelding: string): number {
  const meldingDate = new Date(datumMelding);
  const today = new Date();
  const diffTime = today.getTime() - meldingDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
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
      // Don't sort - we want a representative sample including old meldingen
      const res = await fetch(
        "https://api.data.amsterdam.nl/v1/meldingen/meldingen?_format=json&hoofdcategorie=Afval&externeStatus=Open&_pageSize=500"
      );
      const data = await res.json();
      const meldingen = data._embedded?.meldingen || [];

      // Aggregate by stadsdeel
      const stadsdeelMap = new Map<string, { open: number; overTime: number; dagenOpen: number[] }>();

      for (const m of meldingen) {
        const sd = m.gbdStadsdeelNaam || "Onbekend";
        if (!stadsdeelMap.has(sd)) {
          stadsdeelMap.set(sd, { open: 0, overTime: 0, dagenOpen: [] });
        }
        const s = stadsdeelMap.get(sd)!;
        s.open++;

        // Calculate days open from datumMelding
        if (m.datumMelding) {
          const daysOpen = calculateDaysOpen(m.datumMelding);
          s.dagenOpen.push(daysOpen);
          if (daysOpen > OVER_TIME_THRESHOLD_DAYS) {
            s.overTime++;
          }
        }
      }

      const results: StadsdeelStats[] = [];
      stadsdeelMap.forEach((v, k) => {
        if (k === "Onbekend") return;
        const sorted = v.dagenOpen.sort((a, b) => a - b);
        const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
        results.push({
          name: k,
          openCount: v.open,
          overTimeCount: v.overTime,
          overTimePercent: v.open > 0 ? Math.round((v.overTime / v.open) * 100) : 0,
          medianDagenOpen: Math.round(median),
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
        <p className="text-xs text-gray-600 mt-1">Over tijd = open &gt; {OVER_TIME_THRESHOLD_DAYS} dagen</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-gray-400">Laden...</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {stats.map((s) => {
              const overTimeColor = s.overTimePercent > 50
                ? "text-red-400"
                : s.overTimePercent > 25
                  ? "text-yellow-400"
                  : "text-green-400";

              return (
                <div key={s.name} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{s.name}</h3>
                    <span className="text-2xl font-bold text-orange-400">{s.openCount}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Over tijd (&gt;{OVER_TIME_THRESHOLD_DAYS}d)</p>
                      <p className={overTimeColor}>
                        {s.overTimePercent}% <span className="text-gray-500">({s.overTimeCount})</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Mediaan open</p>
                      <p className={s.medianDagenOpen > OVER_TIME_THRESHOLD_DAYS ? "text-red-400" : "text-gray-300"}>
                        {s.medianDagenOpen} dagen
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
