import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSavedListItems } from "@/lib/practice-lists";
import { SavedListDetail } from "@/components/dashboard/saved-list-detail";

export const dynamic = "force-dynamic";

export default async function SavedListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  /* RLS already scopes practice_lists to the owner, so a list belonging to
     someone else reads as missing rather than forbidden. */
  const list = await getSavedListItems(id);
  if (!list) notFound();

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/dashboard" className="transition-colors hover:text-primary-600">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <Link href="/dashboard/saved" className="transition-colors hover:text-primary-600">
          Saved
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="font-medium text-gray-900 dark:text-gray-100">{list.title}</span>
      </div>

      <SavedListDetail listId={id} title={list.title} items={list.items} />
    </div>
  );
}
