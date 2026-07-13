"use client";

import { useMemo } from "react";

interface HeatmapDay {
  date: string; // ISO date string
  count: number; // number of activities
}

interface MiniHeatmapProps {
  data: HeatmapDay[];
  weeks?: number; // how many weeks to show (default 7)
}

function getIntensity(count: number): string {
  if (count === 0) return "bg-gray-100 dark:bg-gray-800";
  if (count < 2) return "bg-primary-200 dark:bg-primary-900";
  if (count < 4) return "bg-primary-400 dark:bg-primary-700";
  if (count < 6) return "bg-primary-600 dark:bg-primary-500";
  return "bg-primary-700 dark:bg-primary-400";
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function MiniHeatmap({ data, weeks = 7 }: MiniHeatmapProps) {
  // Build a map for quick lookup
  const dataMap = useMemo(() => {
    const m: Record<string, number> = {};
    data.forEach((d) => {
      m[d.date] = d.count;
    });
    return m;
  }, [data]);

  // Generate last `weeks * 7` days as a grid
  const grid = useMemo(() => {
    const days: { date: string; count: number; col: number; row: number }[] = [];
    const today = new Date();
    // Start from `weeks` weeks ago, aligned to Sunday
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (weeks * 7 - 1));

    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      days.push({
        date: iso,
        count: dataMap[iso] ?? 0,
        col: Math.floor(i / 7),
        row: d.getDay(),
      });
    }
    return days;
  }, [dataMap, weeks]);

  const totalActiveDays = grid.filter((d) => d.count > 0).length;
  const totalActivities = grid.reduce((sum, d) => sum + d.count, 0);

  // Month labels: find first day of each month in the grid
  const monthLabels = useMemo(() => {
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    grid.forEach((d) => {
      const date = new Date(d.date);
      const month = date.getMonth();
      if (month !== lastMonth && d.row === 0) {
        labels.push({
          col: d.col,
          label: date.toLocaleDateString("en-US", { month: "short" }),
        });
        lastMonth = month;
      }
    });
    return labels;
  }, [grid]);

  return (
    <section className="p-5 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold">Study Activity</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {totalActivities} activities · {totalActiveDays} active days
          </p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span>Less</span>
          {[0, 1, 3, 5, 7].map((n) => (
            <div key={n} className={`w-3 h-3 rounded-sm ${getIntensity(n)}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Month labels */}
      <div className="grid mb-1" style={{ gridTemplateColumns: `16px repeat(${weeks}, 1fr)` }}>
        <div />
        {Array.from({ length: weeks }).map((_, col) => {
          const label = monthLabels.find((m) => m.col === col);
          return (
            <div key={col} className="text-[10px] text-gray-400 font-medium text-center">
              {label?.label ?? ""}
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `16px repeat(${weeks}, 1fr)`,
          gridTemplateRows: "repeat(7, 1fr)",
        }}
      >
        {DAY_LABELS.map((label, row) => (
          <div
            key={`label-${row}`}
            className="text-[10px] text-gray-400 flex items-center justify-center"
            style={{ gridColumn: 1, gridRow: row + 1 }}
          >
            {row % 2 === 0 ? label : ""}
          </div>
        ))}

        {grid.map((cell) => (
          <div
            key={cell.date}
            style={{ gridColumn: cell.col + 2, gridRow: cell.row + 1 }}
            className={`rounded-sm aspect-square transition-all duration-200 hover:opacity-80 cursor-default ${getIntensity(cell.count)}`}
            title={`${cell.date}: ${cell.count} ${cell.count === 1 ? "activity" : "activities"}`}
          />
        ))}
      </div>

      {/* Empty state nudge */}
      {totalActivities === 0 && (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
          Start learning to fill your heatmap! 🌱
        </p>
      )}
    </section>
  );
}
