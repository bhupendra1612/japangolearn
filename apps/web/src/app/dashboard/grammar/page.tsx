import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChevronRight, BookText } from "lucide-react";
import Link from "next/link";
import { GrammarClient } from "@/components/dashboard/grammar-client";
import type { Json } from "@japangolearn/database";

export const dynamic = "force-dynamic";

function normalizeExamples(value: Json) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || Array.isArray(item) || typeof item !== "object") return [];

    const jp =
      typeof item.jp === "string"
        ? item.jp
        : typeof item.japanese === "string"
          ? item.japanese
          : "";
    const en =
      typeof item.en === "string" ? item.en : typeof item.english === "string" ? item.english : "";
    const romaji = typeof item.romaji === "string" ? item.romaji : "";

    return jp && en ? [{ jp, romaji, en }] : [];
  });
}

export default async function GrammarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: patterns } = await supabase
    .from("grammar_patterns")
    .select("*")
    .eq("jlpt_level", "N5")
    .order("order_index");
  const normalizedPatterns = (patterns ?? []).map((pattern) => ({
    ...pattern,
    examples: normalizeExamples(pattern.examples),
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/dashboard" className="hover:text-primary-600 transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-medium text-gray-900 dark:text-gray-100">Grammar</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl gradient-bg-primary text-white flex items-center justify-center">
              <BookText className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              <span className="gradient-text">Grammar</span> Patterns
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Master {patterns?.length ?? 0} essential JLPT N5 sentence structures
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold">
            N5
          </span>
          <span className="text-gray-400">JLPT Level</span>
        </div>
      </div>

      <GrammarClient patterns={normalizedPatterns} />

      {/* Bottom motivational */}
      <div className="mt-10 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500 font-jp">
          文法は言語の骨格 — Grammar is the skeleton of language.
        </p>
      </div>
    </div>
  );
}
