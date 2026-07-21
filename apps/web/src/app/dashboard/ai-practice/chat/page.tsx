import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AiChatClient } from "@/components/dashboard/ai-chat-client";
import { featureFlags } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

export default async function ChatPage(props: { searchParams: Promise<{ topic?: string }> }) {
  const searchParams = await props.searchParams;
  const topic = searchParams.topic || "Free Conversation";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!featureFlags.aiPractice || !featureFlags.premium) {
    redirect("/dashboard?feature=ai-practice-unavailable");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_jlpt_level")
    .eq("id", user.id)
    .single();

  const currentLevel = profile?.current_jlpt_level ?? "N5";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <AiChatClient topic={topic} level={currentLevel} />
    </div>
  );
}
