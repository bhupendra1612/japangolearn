export default function ReviewLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse p-4 sm:p-6 lg:p-8">
      {/* Breadcrumb */}
      <div className="mb-6 h-4 w-40 rounded bg-gray-200 dark:bg-gray-700/50" />

      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-32 rounded bg-gray-100 dark:bg-gray-700/50" />
        </div>
      </div>

      {/* Session card — matches the real layout so the swap does not jump */}
      <div className="mx-auto max-w-xl">
        <div className="mb-5 space-y-2">
          <div className="flex justify-between">
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700/50" />
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800/60">
          <div className="mb-6 flex justify-center gap-2">
            <div className="h-6 w-20 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-6 w-24 rounded-lg bg-gray-100 dark:bg-gray-700/50" />
          </div>
          <div className="mx-auto h-20 w-40 rounded-2xl bg-gray-200 dark:bg-gray-700" />
          <div className="mx-auto mt-6 h-3 w-56 rounded bg-gray-100 dark:bg-gray-700/50" />
        </div>

        <div className="mt-5 h-14 rounded-2xl bg-gray-200 dark:bg-gray-700/50" />
      </div>
    </div>
  );
}
