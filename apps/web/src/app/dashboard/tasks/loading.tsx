export default function TasksLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-pulse">
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-64 rounded bg-gray-100 dark:bg-gray-700/50" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 mb-2" />
              <div className="h-5 w-16 rounded bg-gray-200 dark:bg-gray-700 mb-1" />
              <div className="h-3 w-12 rounded bg-gray-100 dark:bg-gray-700/50" />
            </div>
          ))}
        </div>
        <div className="h-20 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700" />
        <div className="h-24 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-36 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
