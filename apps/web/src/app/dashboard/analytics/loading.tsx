export default function ContentLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-pulse">
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-72 rounded bg-gray-100 dark:bg-gray-700/50" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-40 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
