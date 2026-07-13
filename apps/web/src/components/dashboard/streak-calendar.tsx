"use client";

interface StreakCalendarProps {
  activeDays: Set<string>; // ISO date strings of active days
  days?: number; // how many days to show (default 30)
}

export function StreakCalendar({ activeDays, days = 30 }: StreakCalendarProps) {
  const today = new Date();
  const cells: { date: string; active: boolean; isToday: boolean }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().split("T")[0];
    cells.push({
      date: iso,
      active: activeDays.has(iso),
      isToday: i === 0,
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {cells.map((cell) => (
          <div
            key={cell.date}
            title={`${cell.date}${cell.active ? " ✓" : ""}`}
            className={`w-5 h-5 rounded-md transition-all duration-200 ${
              cell.active
                ? "bg-green-500 dark:bg-green-400 shadow-sm"
                : "bg-gray-100 dark:bg-gray-700"
            } ${cell.isToday ? "ring-2 ring-primary-400 dark:ring-primary-500" : ""}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-green-500" /> Active
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-700" /> Missed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm ring-2 ring-primary-400 bg-transparent" /> Today
        </span>
      </div>
    </div>
  );
}
