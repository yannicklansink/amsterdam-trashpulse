"use client";

import { useEffect, useState, useCallback } from "react";

export interface MonthlyData {
  month: string;      // "2025-01"
  label: string;      // "Jan"
  count: number;
  year: number;
}

export interface HeatmapCell {
  day: number;        // 0-6 (Zo-Za)
  hour: number;       // 0-23
  count: number;
  intensity: number;  // 0-1 (relatief aan max)
}

export interface TrendsData {
  monthlyTrend: MonthlyData[];
  heatmap: HeatmapCell[];
  peakTime: { day: string; hour: string } | null;
  yearTotal: number;
  yearChange: number; // percentage vs vorig jaar
  loading: boolean;
}

const MONTH_LABELS = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
const DAY_LABELS = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

interface MonthRange {
  start: string;
  end: string;
  label: string;
}

function getLast12Months(): MonthRange[] {
  const months: MonthRange[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth();

    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    months.push({
      start,
      end,
      label: MONTH_LABELS[month],
    });
  }

  return months;
}

async function fetchMonthlyData(): Promise<MonthlyData[]> {
  const months = getLast12Months();

  const promises = months.map(async (m) => {
    try {
      // Use _count=true to get totalElements in page metadata
      const res = await fetch(
        `https://api.data.amsterdam.nl/v1/meldingen/meldingen?` +
        `_format=json&hoofdcategorie=Afval&_count=true&` +
        `datumMelding[gte]=${m.start}&datumMelding[lte]=${m.end}&_pageSize=1`
      );
      const data = await res.json();
      return {
        month: m.start.substring(0, 7),
        label: m.label,
        count: data.page?.totalElements ?? 0,
        year: parseInt(m.start.substring(0, 4)),
      };
    } catch {
      return {
        month: m.start.substring(0, 7),
        label: m.label,
        count: 0,
        year: parseInt(m.start.substring(0, 4)),
      };
    }
  });

  return Promise.all(promises);
}

interface MeldingItem {
  datumMelding: string;
  tijdstipMelding?: string;
}

interface MeldingResponse {
  _embedded?: {
    meldingen: MeldingItem[];
  };
}

function processHeatmap(meldingen: MeldingItem[]): {
  cells: HeatmapCell[];
  peak: { day: string; hour: string } | null;
} {
  const counts = new Map<string, number>();

  for (const m of meldingen) {
    if (!m.tijdstipMelding) continue;
    const date = new Date(`${m.datumMelding}T${m.tijdstipMelding}`);
    if (isNaN(date.getTime())) continue;
    const day = date.getDay();
    const hour = date.getHours();
    const key = `${day}-${hour}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  let maxCount = 0;
  let peakKey = "";
  counts.forEach((count, key) => {
    if (count > maxCount) {
      maxCount = count;
      peakKey = key;
    }
  });

  const cells: HeatmapCell[] = [];

  // Generate cells for hours 6-22
  for (let hour = 6; hour <= 22; hour++) {
    for (let day = 0; day < 7; day++) {
      const key = `${day}-${hour}`;
      const count = counts.get(key) || 0;
      cells.push({
        day,
        hour,
        count,
        intensity: maxCount > 0 ? count / maxCount : 0,
      });
    }
  }

  let peak: { day: string; hour: string } | null = null;
  if (peakKey) {
    const [dayNum, hourNum] = peakKey.split("-").map(Number);
    peak = {
      day: DAY_LABELS[dayNum],
      hour: `${hourNum}:00`,
    };
  }

  return { cells, peak };
}

async function fetchHeatmapData(): Promise<{
  cells: HeatmapCell[];
  peak: { day: string; hour: string } | null;
}> {
  try {
    // Only fetch last 30 days for heatmap
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startDate = thirtyDaysAgo.toISOString().split("T")[0];

    const res = await fetch(
      `https://api.data.amsterdam.nl/v1/meldingen/meldingen?` +
      `_format=json&hoofdcategorie=Afval&_pageSize=2000&_sort=-datumMelding&` +
      `datumMelding[gte]=${startDate}`
    );
    const data: MeldingResponse = await res.json();
    const meldingen = data._embedded?.meldingen || [];
    return processHeatmap(meldingen);
  } catch {
    return { cells: [], peak: null };
  }
}

export function useTrends(): TrendsData {
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyData[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [peakTime, setPeakTime] = useState<{ day: string; hour: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [monthly, heatmapResult] = await Promise.all([
        fetchMonthlyData(),
        fetchHeatmapData(),
      ]);

      setMonthlyTrend(monthly);
      setHeatmap(heatmapResult.cells);
      setPeakTime(heatmapResult.peak);
    } catch (err) {
      console.error("Failed to fetch trends data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate year totals
  const currentYear = new Date().getFullYear();
  const currentYearData = monthlyTrend.filter((m) => m.year === currentYear);
  const previousYearData = monthlyTrend.filter((m) => m.year === currentYear - 1);

  const yearTotal = currentYearData.reduce((sum, m) => sum + m.count, 0);
  const previousYearTotal = previousYearData.reduce((sum, m) => sum + m.count, 0);

  let yearChange = 0;
  if (previousYearTotal > 0) {
    yearChange = Math.round(((yearTotal - previousYearTotal) / previousYearTotal) * 100);
  }

  return {
    monthlyTrend,
    heatmap,
    peakTime,
    yearTotal,
    yearChange,
    loading,
  };
}
