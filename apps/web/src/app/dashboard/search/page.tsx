import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSavedLists } from "@/lib/practice-lists";
import { SearchClient } from "@/components/dashboard/search-client";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const lists = await getSavedLists();

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/dashboard" className="transition-colors hover:text-primary-600">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="font-medium text-gray-900 dark:text-gray-100">Search</span>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="gradient-bg-primary flex h-10 w-10 items-center justify-center rounded-xl text-white">
          <Search className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Search <span className="gradient-text">Everything</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vocabulary, kanji, kana, and grammar in one place
          </p>
        </div>
      </div>

      <SearchClient lists={lists} />
    </div>
  );
}
