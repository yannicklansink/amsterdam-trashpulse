"use client";

import type { Filters } from "@/types";

interface FiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const timeRanges = [
  { value: "1h", label: "1 uur" },
  { value: "24h", label: "24 uur" },
  { value: "7d", label: "7 dagen" },
  { value: "30d", label: "30 dagen" },
] as const;

const statuses = [
  { value: "all", label: "Alle" },
  { value: "open", label: "Open" },
  { value: "afgesloten", label: "Afgesloten" },
] as const;

export default function Filters({ filters, onChange }: FiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-900/80 backdrop-blur border-b border-gray-800">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Periode:</span>
        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          {timeRanges.map((t) => (
            <button
              key={t.value}
              onClick={() => onChange({ ...filters, timeRange: t.value })}
              className={`px-3 py-1.5 text-sm transition ${
                filters.timeRange === t.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Status:</span>
        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => onChange({ ...filters, status: s.value })}
              className={`px-3 py-1.5 text-sm transition ${
                filters.status === s.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm text-gray-400">Live</span>
      </div>
    </div>
  );
}
