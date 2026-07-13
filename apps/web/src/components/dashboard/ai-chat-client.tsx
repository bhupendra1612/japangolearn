"use client";

import { useChat } from "@ai-sdk/react";
import { Send, Bot, User, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

export function AiChatClient({ topic, level }: { topic: string; level: string }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    body: { topic, level },
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        content: `こんにちは！ (Hello!) Let's practice Japanese together. Topic: ${topic}. Ready?`,
      },
    ],
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-[600px] bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden mt-6">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <Link
          href="/dashboard/ai-practice"
          className="p-2 -ml-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="w-10 h-10 rounded-full gradient-bg-primary flex items-center justify-center text-white shrink-0">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100">Sensei AI</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Topic: <span className="capitalize">{topic}</span> • Level: {level}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50 dark:bg-gray-900/50">
        {messages.map((m: import("@ai-sdk/react").Message) => (
          <div
            key={m.id}
            className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                m.role === "user"
                  ? "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  : "gradient-bg-primary text-white"
              }`}
            >
              {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div
              className={`p-4 rounded-2xl text-sm ${
                m.role === "user"
                  ? "bg-primary-600 text-white rounded-tr-sm"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-tl-sm shadow-sm"
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-full gradient-bg-primary flex items-center justify-center shrink-0 text-white">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-tl-sm shadow-sm flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full bg-primary-400 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-primary-400 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-primary-400 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex items-end gap-2 relative">
          <textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1 max-h-32 min-h-[48px] w-full resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const form = e.currentTarget.form;
                if (form) form.requestSubmit();
              }
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-12 h-12 flex items-center justify-center rounded-xl gradient-bg-primary text-white shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            <Send className="w-5 h-5 -ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
