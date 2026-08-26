"use client";

import { useEffect, useRef, useState } from "react";
import { BookmarkPlus, Check, Loader2, Search, TriangleAlert } from "lucide-react";
import type { MasteryItemType } from "@japangolearn/core";
import type { SearchHit } from "@/app/actions/search";
import type { SavedListSummary } from "@/lib/practice-lists";

const TYPE_STYLE: Record<MasteryItemType, string> = {
  vocabulary: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  kana: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  kanji: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  grammar: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

const TYPE_LABEL: Record<MasteryItemType, string> = {
  vocabulary: "Vocab",
  kana: "Kana",
  kanji: "Kanji",
  grammar: "Grammar",
};

export function SearchClient({ lists }: { lists: SavedListSummary[] }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [targetList, setTargetList] = useState(lists[0]?.id ?? "");

  /* Guards against an earlier, slower request overwriting a later one. */
  const requestRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setHits([]);
      setStatus("idle");
      return;
    }

    setStatus("searching");
    const requestId = ++requestRef.current;

    const timer = window.setTimeout(async () => {
      try {
        const { searchCurriculum } = await import("@/app/actions/search");
        const result = await searchCurriculum(trimmed);
        if (requestId !== requestRef.current) return;

        if (result.ok) {
          setHits(result.value);
          setStatus("done");
          setError(null);
        } else {
          setStatus("error");
          setError(result.error.message);
        }
      } catch {
        if (requestId !== requestRef.current) return;
        setStatus("error");
        setError("Search is unavailable right now.");
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  const save = async (hit: SearchHit) => {
    if (!targetList) return;
    const key = `${hit.itemType}:${hit.itemId}`;
    setSavedKeys((current) => new Set(current).add(key));

    const { addItemToList } = await import("@/app/actions/practice-lists");
    const result = await addItemToList({
      listId: targetList,
      itemType: hit.itemType,
      itemId: hit.itemId,
    });

    if (!result.ok) {
      setSavedKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
      setError(result.error.message);
    }
  };

  return (
    <div>
      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search 水, mizu, water, は…"
          aria-label="Search the curriculum"
          autoFocus
          className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-12 pr-12 text-base outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-800/60"
        />
        {status === "searching" && (
          <Loader2
            className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-gray-400"
            aria-hidden="true"
          />
        )}
      </div>

      {lists.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="target-list" className="text-gray-500 dark:text-gray-400">
            Save to
          </label>
          <select
            id="target-list"
            value={targetList}
            onChange={(event) => setTargetList(event.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60"
          >
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {status === "done" && hits.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center dark:border-gray-700 dark:bg-gray-800/60">
          <p className="text-3xl">🔍</p>
          <p className="mt-2 text-sm font-medium">Nothing matched “{query.trim()}”</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Try the English meaning, the romaji, or the character itself.
          </p>
        </div>
      )}

      {status === "idle" && (
        <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Search across vocabulary, kanji, kana, and grammar at once.
          </p>
        </div>
      )}

      <div className="space-y-2" aria-live="polite">
        {hits.map((hit) => {
          const key = `${hit.itemType}:${hit.itemId}`;
          const isSaved = savedKeys.has(key);

          return (
            <div
              key={key}
              className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 dark:border-gray-700 dark:bg-gray-800/60"
            >
              <span
                className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold ${TYPE_STYLE[hit.itemType]}`}
              >
                {TYPE_LABEL[hit.itemType]}
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-jp truncate text-lg font-bold" lang="ja">
                  {hit.title}
                </p>
                <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                  {hit.subtitle && <span className="font-jp mr-2">{hit.subtitle}</span>}
                  {hit.meaning}
                </p>
              </div>

              {hit.jlptLevel && (
                <span className="hidden shrink-0 text-xs font-medium text-gray-400 sm:inline">
                  {hit.jlptLevel}
                </span>
              )}

              {lists.length > 0 && (
                <button
                  type="button"
                  onClick={() => void save(hit)}
                  disabled={isSaved}
                  aria-label={isSaved ? `${hit.title} saved` : `Save ${hit.title}`}
                  className={`shrink-0 rounded-xl p-2 transition-colors ${
                    isSaved
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-400 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-gray-700"
                  }`}
                >
                  {isSaved ? (
                    <Check className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <BookmarkPlus className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
