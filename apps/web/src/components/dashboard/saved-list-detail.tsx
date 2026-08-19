"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Trash2, TriangleAlert, Volume2 } from "lucide-react";
import type { MasteryItemType } from "@japangolearn/core";
import type { SavedListItem } from "@/lib/practice-lists";

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

export function SavedListDetail({
  listId,
  title,
  items,
}: {
  listId: string;
  title: string;
  items: SavedListItem[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.85;
    const japanese = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("ja"));
    if (japanese) utterance.voice = japanese;
    window.speechSynthesis.speak(utterance);
  };

  const remove = (itemRowId: string) => {
    startTransition(async () => {
      const { removeItemFromList } = await import("@/app/actions/practice-lists");
      const result = await removeItemFromList({ itemRowId, listId });
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error.message);
      }
    });
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {items.length} item{items.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/dashboard/search"
          className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Add items
        </Link>
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

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-12 text-center dark:border-gray-700">
          <p className="text-4xl">🗒️</p>
          <p className="mt-3 font-semibold">This list is empty</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Find something in search and save it here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 dark:border-gray-700 dark:bg-gray-800/60"
            >
              <span
                className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold ${TYPE_STYLE[item.itemType]}`}
              >
                {TYPE_LABEL[item.itemType]}
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-jp truncate text-lg font-bold" lang="ja">
                  {item.title}
                </p>
                <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                  {item.subtitle && <span className="font-jp mr-2">{item.subtitle}</span>}
                  {item.meaning}
                </p>
              </div>

              <button
                type="button"
                onClick={() => speak(item.subtitle ?? item.title)}
                aria-label={`Hear ${item.title}`}
                className="shrink-0 rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-gray-700"
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => remove(item.id)}
                disabled={pending}
                aria-label={`Remove ${item.title}`}
                className="shrink-0 rounded-xl p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
