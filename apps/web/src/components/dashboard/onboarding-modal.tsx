"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2, ArrowRight, X } from "lucide-react";

const JLPT_LEVELS = [
  { value: "N5", label: "N5 — Beginner", emoji: "🌱", desc: "I'm just starting!" },
  { value: "N4", label: "N4 — Elementary", emoji: "📗", desc: "I know some basics" },
  { value: "N3", label: "N3 — Intermediate", emoji: "📘", desc: "I can hold conversations" },
  { value: "N2", label: "N2 — Upper Intermediate", emoji: "📙", desc: "I read newspapers" },
  { value: "N1", label: "N1 — Advanced", emoji: "📕", desc: "Near-native level" },
];

export function OnboardingModal() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("N5");
  const [dismissed, setDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSkip = () => {
    // Mark as skipped in localStorage so it doesn't show again this session
    try {
      localStorage.setItem("ej_onboarding_skipped", "true");
    } catch {}
    setDismissed(true);
  };

  const handleComplete = () => {
    setError(null);
    startTransition(async () => {
      try {
        const { completeOnboarding } = await import("@/app/actions/profile");
        const formData = new FormData();
        formData.set("display_name", name.trim() || "Learner");
        formData.set("current_jlpt_level", level);
        const result = await completeOnboarding(formData);
        if (result.ok) {
          setDismissed(true);
          // Reload to refresh server data
          window.location.reload();
        } else {
          // If server action fails, still dismiss and save to localStorage
          console.error("Onboarding action failed:", result.error.message);
          try {
            localStorage.setItem("ej_onboarding_skipped", "true");
          } catch {}
          setDismissed(true);
        }
      } catch (err) {
        console.error("Onboarding failed:", err);
        // Dismiss anyway so user isn't stuck
        try {
          localStorage.setItem("ej_onboarding_skipped", "true");
        } catch {}
        setDismissed(true);
      }
    });
  };

  if (dismissed) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="gradient-bg-primary p-6 text-center text-white relative">
          <div className="absolute inset-0 jp-pattern opacity-10" />
          {/* Skip / Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors z-10"
            title="Skip for now"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative">
            <p className="text-4xl mb-2">🎌</p>
            <h2 className="text-xl font-bold">Welcome to JapanGoLearn!</h2>
            <p className="text-sm text-white/80 mt-1">Let&apos;s set up your profile</p>
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Name */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">What should we call you?</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name or nickname"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  maxLength={50}
                  autoFocus
                />
              </div>
              <button
                onClick={() => setStep(1)}
                disabled={name.trim().length < 2}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl gradient-bg-primary text-white text-sm font-semibold shadow-md disabled:opacity-40 transition-all"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleSkip}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-1"
              >
                Skip for now →
              </button>
            </div>
          )}

          {/* Step 2: JLPT Level */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold">What&apos;s your Japanese level?</p>
              <div className="space-y-2">
                {JLPT_LEVELS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLevel(l.value)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      level === l.value
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-2xl">{l.emoji}</span>
                    <div>
                      <p className="text-sm font-medium">{l.label}</p>
                      <p className="text-xs text-gray-400">{l.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {error && <p className="text-xs text-red-500 text-center">{error}</p>}

              <button
                onClick={handleComplete}
                disabled={isPending}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl gradient-bg-primary text-white text-sm font-semibold shadow-md disabled:opacity-60 transition-all"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Start Learning!
                  </>
                )}
              </button>

              <button
                onClick={handleSkip}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-1"
              >
                Decide later →
              </button>
            </div>
          )}

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {[0, 1].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step ? "w-8 gradient-bg-primary" : "w-2 bg-gray-200 dark:bg-gray-700"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
