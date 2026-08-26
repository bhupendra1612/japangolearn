"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

interface DeleteAccountPanelProps {
  email: string;
}

export function DeleteAccountPanel({ email }: DeleteAccountPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleDelete = () => {
    startTransition(async () => {
      const { deleteAccount } = await import("@/app/actions/account");
      const result = await deleteAccount();
      if (result.ok) {
        setStatus("done");
        window.location.href = "/";
      } else {
        setErrorMsg(result.error.message || "Failed to delete account");
        setStatus("error");
      }
    });
  };

  if (status === "done") {
    return (
      <div className="p-5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">
        Your account has been deleted. Redirecting you home…
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl border border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        You are signed in as <strong>{email}</strong>.
      </p>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete My Account
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-4 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              This permanently deletes your account, learning progress, and personal data right now.
              This cannot be undone.
            </span>
          </div>
          {status === "error" && (
            <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
              {errorMsg}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Yes, Delete Forever
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DeleteAccountSignedOut() {
  return (
    <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        You need to be signed in to delete your account. Log in below, then return to this page to
        finish deleting it.
      </p>
      <Link
        href="/login"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        Log In
      </Link>
    </div>
  );
}
