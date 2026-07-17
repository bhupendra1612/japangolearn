"use client";

import { Badge, Card } from "@japangolearn/ui";
import { ArrowLeft, Bot } from "lucide-react";
import Link from "next/link";

export function AiChatClient({ topic, level }: { topic: string; level: string }) {
  return (
    <Card className="mt-6 overflow-hidden bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800 dark:text-white">
      <Link
        href="/dashboard"
        className="mb-8 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-bg-primary text-white">
        <Bot className="h-8 w-8" />
      </div>
      <Badge tone="warning">Feature disabled</Badge>
      <h1 className="mt-4 text-2xl font-bold">AI practice is not available yet</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
        The {topic} practice flow for level {level} will be enabled only after model safety, usage
        limits, privacy controls, and billing protections are complete.
      </p>
    </Card>
  );
}
