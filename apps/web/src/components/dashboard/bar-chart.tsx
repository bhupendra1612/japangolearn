"use client";

interface BarChartProps {
  data: { label: string; value: number }[];
  maxValue?: number;
  barColor?: string;
  height?: number;
  unit?: string;
}

export function SimpleBarChart({
  data,
  maxValue,
  barColor = "gradient-bg-primary",
  height = 160,
  unit = "",
}: BarChartProps) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((item, idx) => {
        const pct = (item.value / max) * 100;
        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
            {/* Value label on hover */}
            <span className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
              {item.value}
              {unit}
            </span>

            {/* Bar */}
            <div
              className="w-full relative rounded-t-lg overflow-hidden bg-gray-100 dark:bg-gray-700"
              style={{ height: `${height - 32}px` }}
            >
              <div
                className={`absolute bottom-0 left-0 right-0 rounded-t-lg ${barColor} transition-all duration-700 ease-out group-hover:opacity-90`}
                style={{ height: `${Math.max(pct, 2)}%` }}
              />
            </div>

            {/* Label */}
            <span className="text-[10px] text-gray-400 font-medium">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
