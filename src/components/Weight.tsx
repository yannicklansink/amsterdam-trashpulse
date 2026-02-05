"use client";

import type { Filters } from "@/types";
import { useWeging, type RecentWeging, type BuurtWeight } from "@/hooks/useWeging";

interface WeightProps {
  filters: Filters;
  onLocationClick: (center: [number, number]) => void;
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
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-800 rounded" />
        ))}
      </div>
    </div>
  );
}

function LiveTrackerItem({ weging, onClick }: { weging: RecentWeging; onClick: () => void }) {
  return (
    <li
      onClick={onClick}
      className="flex items-center gap-3 p-2 hover:bg-gray-800 rounded cursor-pointer transition"
    >
      <span className="text-xs text-gray-500 font-mono w-12">{weging.time}</span>
      <span className="text-xs bg-gray-700 px-2 py-0.5 rounded font-mono">{weging.kenteken}</span>
      <span className="flex-1 text-sm truncate text-gray-300">{weging.location}</span>
      <span className="text-sm font-medium text-orange-400">{weging.weight.toFixed(1)} kg</span>
    </li>
  );
}

function BuurtItem({ buurt, rank, onClick }: { buurt: BuurtWeight; rank: number; onClick: () => void }) {
  return (
    <li
      onClick={onClick}
      className="flex items-center gap-3 p-2 hover:bg-gray-800 rounded cursor-pointer transition"
    >
      <span className="w-6 h-6 flex items-center justify-center text-xs font-bold bg-gray-700 rounded">
        {rank}
      </span>
      <span className="flex-1 text-sm truncate">{buurt.buurtNaam}</span>
      <div className="text-right">
        <span className="text-sm font-medium text-blue-400">{formatWeight(buurt.totalWeight)}</span>
        <span className="text-xs text-gray-500 ml-2">({buurt.count}x)</span>
      </div>
    </li>
  );
}

export default function Weight({ filters, onLocationClick }: WeightProps) {
  const { buurtTotals, recentWegingen, trend, loading } = useWeging(filters);

  if (loading && buurtTotals.length === 0) {
    return <SkeletonLoader />;
  }

  const trendColor = trend.percentageChange > 0 ? "text-green-400" : trend.percentageChange < 0 ? "text-red-400" : "text-gray-400";
  const trendArrow = trend.percentageChange > 0 ? "↑" : trend.percentageChange < 0 ? "↓" : "→";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Live Tracker Section */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
          <h3 className="text-sm font-semibold text-gray-300">Live Ophaalactiviteit</h3>
        </div>
        {recentWegingen.length > 0 ? (
          <ul className="space-y-1">
            {recentWegingen.slice(0, 5).map((w) => (
              <LiveTrackerItem
                key={w.id}
                weging={w}
                onClick={() => onLocationClick(w.coordinates)}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic">
            Geen recente activiteit (laatste uur)
          </p>
        )}
      </div>

      {/* Trend Section */}
      <div className="p-4 border-b border-gray-800 bg-gray-800/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Totaal opgehaald</p>
            <p className="text-2xl font-bold">{formatWeight(trend.currentTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">vs vorige periode</p>
            <p className={`text-lg font-semibold ${trendColor}`}>
              {trendArrow} {Math.abs(trend.percentageChange)}%
            </p>
          </div>
        </div>
      </div>

      {/* Top Buurten Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Top Buurten (gewicht)</h3>
          {buurtTotals.length > 0 ? (
            <ul className="space-y-1">
              {buurtTotals.map((buurt, i) => (
                <BuurtItem
                  key={buurt.buurtNaam}
                  buurt={buurt}
                  rank={i + 1}
                  onClick={() => onLocationClick(buurt.center)}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">
              Geen data beschikbaar voor deze periode
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
