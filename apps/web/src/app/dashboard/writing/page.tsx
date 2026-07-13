import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChevronRight, PenLine } from "lucide-react";
import Link from "next/link";
import { WritingClient } from "@/components/dashboard/writing-client";

export const dynamic = "force-dynamic";

export default async function WritingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: kanaList } = await supabase
    .from("kana")
    .select("*")
    .eq("type", "hiragana")
    .order("sort_order");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/dashboard" className="hover:text-primary-600 transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-medium text-gray-900 dark:text-gray-100">Writing System</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl gradient-bg-primary text-white flex items-center justify-center">
              <PenLine className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              <span className="gradient-text">Hiragana</span> ひらがな
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Master the {kanaList?.length ?? 0} basic Hiragana characters — tap any character to
            learn
          </p>
        </div>
      </div>

      <WritingClient kanaList={kanaList ?? []} />

      {/* Bottom */}
      <div className="mt-10 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500 font-jp">
          千里の道も一歩から — A journey of a thousand miles begins with a single step.
        </p>
      </div>
    </div>
  );
}
