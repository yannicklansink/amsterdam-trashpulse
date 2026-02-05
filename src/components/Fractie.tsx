"use client";

import type { Filters } from "@/types";
import { useWeging, type FractieWeight } from "@/hooks/useWeging";

interface FractieProps {
  filters: Filters;
}

function formatWeight(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)} ton`;
  }
  return `${kg.toFixed(1)} kg`;
}

function SkeletonLoader() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="h-4 bg-gray-700 rounded w-1/3" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-16 h-4 bg-gray-700 rounded" />
            <div className="flex-1 h-3 bg-gray-800 rounded-full" />
            <div className="w-12 h-4 bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FractieBar({ fractie }: { fractie: FractieWeight }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-16 text-sm truncate text-gray-300">{fractie.fractie}</span>
      <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${fractie.percentage}%`,
            backgroundColor: fractie.color,
          }}
        />
      </div>
      <span className="w-10 text-right text-sm font-medium text-gray-300">{fractie.percentage}%</span>
    </div>
  );
}

function FractieListItem({ fractie }: { fractie: FractieWeight }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: fractie.color }}
      />
      <span className="flex-1 text-sm text-gray-300">{fractie.fractie}</span>
      <div className="text-right">
        <span className="text-sm font-medium" style={{ color: fractie.color }}>
          {formatWeight(fractie.totalWeight)}
        </span>
        <span className="text-xs text-gray-500 ml-2">({fractie.count}x)</span>
      </div>
    </li>
  );
}

export default function Fractie({ filters }: FractieProps) {
  const { fractieTotals, trend, loading } = useWeging(filters);

  if (loading && fractieTotals.length === 0) {
    return <SkeletonLoader />;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Verdeling Section */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Afvaltype Verdeling</h3>
        {fractieTotals.length > 0 ? (
          <div className="space-y-1">
            {fractieTotals.map((f) => (
              <FractieBar key={f.fractie} fractie={f} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">Geen data beschikbaar</p>
        )}
        <div className="mt-4 pt-3 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Totaal</span>
            <span className="text-lg font-bold">{formatWeight(trend.currentTotal)}</span>
          </div>
        </div>
      </div>

      {/* Detail lijst Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Per Afvaltype</h3>
          {fractieTotals.length > 0 ? (
            <ul className="space-y-1">
              {fractieTotals.map((f) => (
                <FractieListItem key={f.fractie} fractie={f} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">Geen data beschikbaar voor deze periode</p>
          )}
        </div>
      </div>
    </div>
  );
}
