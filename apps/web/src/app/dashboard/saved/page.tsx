import { redirect } from "next/navigation";
import Link from "next/link";
import { Bookmark, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSavedLists } from "@/lib/practice-lists";
import { SavedListsClient } from "@/components/dashboard/saved-lists-client";

export const dynamic = "force-dynamic";

export default async function SavedListsPage() {
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
        <span className="font-medium text-gray-900 dark:text-gray-100">Saved</span>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="gradient-bg-primary flex h-10 w-10 items-center justify-center rounded-xl text-white">
          <Bookmark className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Saved <span className="gradient-text">Lists</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your own collections, shared with the mobile app
          </p>
        </div>
      </div>

      <SavedListsClient lists={lists} />
    </div>
  );
}
