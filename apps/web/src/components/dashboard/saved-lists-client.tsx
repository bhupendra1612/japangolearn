"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, FolderPlus, Loader2, Trash2, TriangleAlert } from "lucide-react";
import type { SavedListSummary } from "@/lib/practice-lists";

export function SavedListsClient({ lists }: { lists: SavedListSummary[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const create = () => {
    const clean = title.trim();
    if (clean.length === 0 || pending) return;

    startTransition(async () => {
      const { createSavedList } = await import("@/app/actions/practice-lists");
      const result = await createSavedList(clean);
      if (result.ok) {
        setTitle("");
        setError(null);
        router.refresh();
      } else {
        setError(result.error.message);
      }
    });
  };

  const remove = (listId: string) => {
    startTransition(async () => {
      const { deleteSavedList } = await import("@/app/actions/practice-lists");
      const result = await deleteSavedList(listId);
      if (result.ok) {
        setConfirmingId(null);
        router.refresh();
      } else {
        setError(result.error.message);
      }
    });
  };

  return (
    <div>
      {/* Create */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") create();
          }}
          maxLength={60}
          placeholder="New list name — e.g. Tricky verbs"
          aria-label="New list name"
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-800/60"
        />
        <button
          type="button"
          onClick={create}
          disabled={pending || title.trim().length === 0}
          className="gradient-bg-primary flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <FolderPlus className="h-4 w-4" aria-hidden="true" />
          )}
          Create list
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {lists.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-12 text-center dark:border-gray-700">
          <p className="text-4xl">📑</p>
          <p className="mt-3 font-semibold">No saved lists yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Create a list, then save words, kanji, and grammar into it from search. Lists sync with
            the mobile app.
          </p>
          <Link
            href="/dashboard/search"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Go to search
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {lists.map((list) => (
            <div
              key={list.id}
              className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60"
            >
              <Link href={`/dashboard/saved/${list.id}`} className="min-w-0 flex-1">
                <p className="truncate font-semibold">{list.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {list.itemCount} item{list.itemCount === 1 ? "" : "s"}
                  {list.isSmartList && " · smart list"}
                </p>
              </Link>

              {confirmingId === list.id ? (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => remove(list.id)}
                    disabled={pending}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingId(list.id)}
                  aria-label={`Delete ${list.title}`}
                  className="shrink-0 rounded-xl p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
