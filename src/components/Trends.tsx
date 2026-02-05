"use client";

import { useTrends, type MonthlyData, type HeatmapCell } from "@/hooks/useTrends";

const DAY_LABELS = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
const HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22];

const SKELETON_HEIGHTS = [30, 45, 60, 40, 55, 70, 50, 65, 75, 55, 45, 60];

function SkeletonLoader() {
  return (
    <div className="animate-pulse p-4 space-y-6">
      <div>
        <div className="h-4 bg-gray-700 rounded w-2/3 mb-4" />
        <div className="flex items-end gap-1 h-32">
          {SKELETON_HEIGHTS.map((height, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-700 rounded-t"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
      <div>
        <div className="h-4 bg-gray-700 rounded w-1/2 mb-4" />
        <div className="grid grid-cols-8 gap-1">
          {[...Array(72)].map((_, i) => (
            <div key={i} className="h-5 bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

function BarChart({ data }: { data: MonthlyData[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const currentMonth = new Date().toISOString().substring(0, 7);

  return (
    <div className="space-y-1">
      <div className="flex items-end gap-1 h-28">
        {data.map((d) => {
          const heightPercent = (d.count / maxCount) * 100;
          const isCurrentMonth = d.month === currentMonth;

          return (
            <div
              key={d.month}
              className="flex-1 h-full flex items-end justify-center group relative"
            >
              <div
                className={`w-full rounded-t transition-all cursor-pointer ${
                  isCurrentMonth
                    ? "bg-amber-500 hover:bg-amber-400"
                    : "bg-blue-500 hover:bg-blue-400"
                }`}
                style={{ height: `${Math.max(heightPercent, 2)}%` }}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {d.count.toLocaleString()} meldingen
              </div>
            </div>
          );
        })}
      </div>
      {/* Labels row */}
      <div className="flex gap-1">
        {data.map((d) => (
          <div key={d.month} className="flex-1 text-center">
            <span className="text-[10px] text-gray-500">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Heatmap({ data }: { data: HeatmapCell[] }) {
  // Reorganize data for display: columns = days (Ma-Zo), rows = hours
  const getCell = (day: number, hour: number) =>
    data.find((c) => c.day === day && c.hour === hour);

  // Reorder days to start with Monday (1) and end with Sunday (0)
  const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Ma, Di, Wo, Do, Vr, Za, Zo
  const dayLabels = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

  return (
    <div className="space-y-1">
      {/* Header row */}
      <div className="grid grid-cols-8 gap-1">
        <div /> {/* empty corner */}
        {dayLabels.map((d) => (
          <div key={d} className="text-[10px] text-gray-500 text-center">
            {d}
          </div>
        ))}
      </div>

      {/* Data rows */}
      {HOURS.map((hour) => (
        <div key={hour} className="grid grid-cols-8 gap-1">
          <div className="text-[10px] text-gray-500 flex items-center">{hour}:00</div>
          {dayOrder.map((dayIndex, i) => {
            const cell = getCell(dayIndex, hour);
            const intensity = cell?.intensity || 0;
            const count = cell?.count || 0;

            return (
              <div
                key={`${dayIndex}-${hour}`}
                className="h-5 rounded cursor-pointer transition-all hover:ring-1 hover:ring-white/30 group relative"
                style={{
                  backgroundColor: `rgba(59, 130, 246, ${0.1 + intensity * 0.9})`,
                }}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {dayLabels[i]} {hour}:00 - {count} meldingen
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-2 text-[10px] text-gray-500">
      <span>Weinig</span>
      <div className="flex gap-0.5">
        {[0.1, 0.3, 0.5, 0.7, 1.0].map((intensity) => (
          <div
            key={intensity}
            className="w-3 h-3 rounded"
            style={{ backgroundColor: `rgba(59, 130, 246, ${intensity})` }}
          />
        ))}
      </div>
      <span>Veel</span>
    </div>
  );
}

export default function Trends() {
  const { monthlyTrend, heatmap, peakTime, yearTotal, yearChange, loading } = useTrends();

  if (loading && monthlyTrend.length === 0) {
    return <SkeletonLoader />;
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Monthly Trend Section */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-1 flex items-center gap-2">
          <span>Meldingen per Maand</span>
          <span className="text-[10px] text-gray-500 font-normal">(laatste 12 maanden)</span>
        </h3>
        <p className="text-[11px] text-gray-500 mb-4">
          Meldingen over afvalproblemen: bijplaatsingen, volle containers, zwerfvuil, etc.
        </p>

        {monthlyTrend.length > 0 ? (
          <BarChart data={monthlyTrend} />
        ) : (
          <p className="text-sm text-gray-500 italic">Geen data beschikbaar</p>
        )}

        {/* Stats */}
        <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Totaal dit jaar</span>
            <div className="text-lg font-bold">{yearTotal.toLocaleString()}</div>
          </div>
          {yearChange !== 0 && (
            <div className={`text-right ${yearChange > 0 ? "text-red-400" : "text-green-400"}`}>
              <span className="text-xs text-gray-500 uppercase tracking-wide">vs vorig jaar</span>
              <div className="text-lg font-bold">
                {yearChange > 0 ? "+" : ""}
                {yearChange}%{" "}
                <span className="text-sm">{yearChange > 0 ? "↑" : "↓"}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Heatmap Section */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">
          Wanneer worden meldingen gemaakt?
        </h3>

        {heatmap.length > 0 ? (
          <>
            <Heatmap data={heatmap} />
            <div className="mt-3 flex items-center justify-between">
              <Legend />
              {peakTime && (
                <div className="text-xs text-gray-400">
                  Piek: <span className="text-blue-400 font-medium">{peakTime.day} {peakTime.hour}</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500 italic">Geen data beschikbaar</p>
        )}
      </div>
    </div>
  );
}
