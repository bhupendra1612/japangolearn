export default function ProfileLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-1.5 mb-6">
        <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-3 w-3 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-4 w-14 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>

      {/* Header card skeleton */}
      <div className="rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        {/* Banner */}
        <div className="h-32 sm:h-40 bg-gradient-to-br from-primary-400/30 to-primary-600/30 dark:from-primary-800/30 dark:to-primary-900/30 animate-pulse relative">
          <div className="absolute top-6 right-8 w-16 h-16 rounded-lg bg-white/5 animate-pulse" />
        </div>

        <div className="px-5 sm:px-8 pb-6">
          {/* Avatar + info row */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14 sm:-mt-16 mb-6">
            {/* Avatar skeleton */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gray-300 dark:bg-gray-600 border-4 border-white dark:border-gray-800 shadow-xl animate-pulse shrink-0" />

            <div className="flex-1 min-w-0 pt-2 space-y-3">
              <div className="h-8 w-48 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="flex gap-4">
                <div className="h-4 w-44 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </div>
              <div className="h-9 w-28 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>

            {/* Level ring skeleton */}
            <div className="hidden sm:block shrink-0">
              <div className="w-[88px] h-[88px] rounded-full border-[6px] border-gray-200 dark:border-gray-700 animate-pulse" />
            </div>
          </div>

          {/* XP bar skeleton */}
          <div className="mb-5">
            <div className="flex justify-between mb-1.5">
              <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div className="h-full w-1/3 rounded-full bg-gray-200 dark:bg-gray-600 animate-pulse" />
            </div>
          </div>

          {/* Stats row skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-600 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-4 w-10 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
                  <div className="h-2.5 w-14 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap skeleton */}
      <div className="p-5 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-700/50 animate-pulse" />
      </div>

      {/* Two-column grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700"
          >
            <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="flex items-center justify-between py-2">
                  <div className="h-4 w-24 rounded bg-gray-100 dark:bg-gray-700/50 animate-pulse" />
                  <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Achievements skeleton */}
      <div className="p-5 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-28 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 animate-pulse"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-600" />
              <div className="h-3 w-14 rounded bg-gray-200 dark:bg-gray-600" />
              <div className="h-2 w-10 rounded bg-gray-100 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
