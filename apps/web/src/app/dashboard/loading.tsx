export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-pulse">
      <div className="space-y-6">
        {/* Hero skeleton */}
        <div className="h-48 rounded-2xl bg-gray-200 dark:bg-gray-700/50" />

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700"
            >
              <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700 mb-3" />
              <div className="h-7 w-16 rounded bg-gray-200 dark:bg-gray-700 mb-1" />
              <div className="h-3 w-12 rounded bg-gray-100 dark:bg-gray-700/50" />
            </div>
          ))}
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-700/50" />
                </div>
              </div>
              <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-700/50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
