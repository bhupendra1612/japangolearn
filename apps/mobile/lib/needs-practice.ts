type NeedsPracticeLookup = {
  id?: string | null;
  error?: unknown;
};

function isNoRowsError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return (
    candidate.code === "PGRST116" ||
    (typeof candidate.message === "string" &&
      /no rows|0 rows|multiple or no rows/i.test(candidate.message))
  );
}

export async function resolveNeedsPracticeList(
  lookup: NeedsPracticeLookup,
  cachedListId: string | null,
  createList: () => Promise<string | null>
): Promise<{ id: string | null; created: boolean }> {
  if (lookup.id) return { id: lookup.id, created: false };

  if (lookup.error && !isNoRowsError(lookup.error)) {
    return { id: cachedListId, created: false };
  }

  const id = await createList();
  return { id, created: id !== null };
}
