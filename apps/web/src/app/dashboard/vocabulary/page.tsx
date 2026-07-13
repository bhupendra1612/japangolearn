import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChevronRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { VocabularyClient } from "@/components/dashboard/vocabulary-client";

export const dynamic = "force-dynamic";

export default async function VocabularyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: words } = await supabase
    .from("vocabulary")
    .select("id, kanji, hiragana, romaji, romaji_hindi, english, topic, icon")
    .order("id");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/dashboard" className="hover:text-primary-600 transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-medium text-gray-900 dark:text-gray-100">Vocabulary</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl gradient-bg-primary text-white flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              <span className="gradient-text">Vocabulary</span> Library
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Browse {words?.length ?? 0} Japanese words across{" "}
            {new Set(words?.map((w) => w.topic)).size} topics
          </p>
        </div>
      </div>

      <VocabularyClient words={words ?? []} />

      {/* Bottom motivational */}
      <div className="mt-10 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500 font-jp">
          語彙は言語の基礎 — Vocabulary is the foundation of language.
        </p>
      </div>
    </div>
  );
}
