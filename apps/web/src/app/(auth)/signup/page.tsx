"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Mail, Lock, User, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { DEFAULT_JLPT_LEVEL } from "@japangolearn/content";
import { AuthBrandHeader } from "@/components/auth/auth-brand-header";
import { JlptLevelSelect } from "@/components/auth/jlpt-level-select";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [jlptLevel, setJlptLevel] = useState<string>(DEFAULT_JLPT_LEVEL);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [resumedSignup, setResumedSignup] = useState(false);

  // Cooldown between "resend code" clicks.
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
          current_jlpt_level: jlptLevel,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Supabase returns success (with an empty identities array) when the email
    // already has a confirmed account, so it never leaks which addresses are
    // registered. Detect it rather than showing a code screen for a code that
    // was never sent.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      setError("This email is already registered. Please log in instead.");
      setLoading(false);
      return;
    }

    // An account that exists but was never confirmed still has identities and
    // does get a fresh code. Its created_at predates this request, which is the
    // only way to tell it apart from a brand new signup.
    const createdAtMs = data.user?.created_at ? Date.parse(data.user.created_at) : Date.now();
    if (!data.session && Number.isFinite(createdAtMs) && Date.now() - createdAtMs > 10_000) {
      setResumedSignup(true);
    }

    setLoading(false);
    if (data.session) {
      // Email confirmation disabled — straight in.
      window.location.href = "/dashboard";
      return;
    }
    // Supabase mailed a 6-digit code; collect it here instead of sending the
    // user off to click a link in their inbox.
    setSuccess(true);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.replace(/\D/g, "");
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    setError("");
    setVerifying(true);

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });

    if (error) {
      setError(error.message || "That code is not valid. Check it and try again.");
      setVerifying(false);
      return;
    }
    window.location.href = "/dashboard";
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      setError(error.message || "Could not resend the code");
      return;
    }
    setResendIn(60);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-surface-dark relative overflow-hidden px-4">
        <div className="absolute inset-0 gradient-bg-hero" />
        <div className="relative w-full max-w-md animate-scale-in">
          <AuthBrandHeader
            linkHome={false}
            title="Check your email 📧"
            subtitle={
              resumedSignup ? (
                <>
                  This email was already registered but never verified. We sent a new code to{" "}
                  <strong>{email}</strong>.
                </>
              ) : (
                <>
                  We sent a 6-digit code to <strong>{email}</strong>. Enter it below to activate
                  your account.
                </>
              )
            }
          />

          <form
            onSubmit={handleVerifyOtp}
            className="p-8 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 shadow-xl space-y-5"
          >
            <div>
              <label htmlFor="otp" className="block text-sm font-medium mb-2">
                Verification code
              </label>
              <input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="––––––"
                className="w-full text-center text-3xl font-bold tracking-[0.5em] py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={verifying}
              className="w-full flex items-center justify-center gap-2 gradient-bg-primary text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-all duration-300 disabled:opacity-50"
            >
              {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Continue"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendIn > 0}
                className="text-primary-600 dark:text-primary-400 font-medium hover:underline disabled:text-gray-400 disabled:no-underline"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSuccess(false);
                  setOtp("");
                  setError("");
                }}
                className="text-gray-500 dark:text-gray-400 hover:underline"
              >
                Use a different email
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-surface-dark relative overflow-hidden px-4 py-12">
      {/* Background */}
      <div className="absolute inset-0 gradient-bg-hero" />
      <div className="absolute inset-0 jp-pattern opacity-30" />
      <div className="absolute top-20 left-20 w-72 h-72 bg-sakura-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        <AuthBrandHeader
          title="Create Your Account"
          subtitle="Start your Japanese journey today — for free!"
        />

        {/* Form Card */}
        <div className="p-8 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 shadow-xl neon-glow animate-scale-in">
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="Your name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-11 pr-11 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* JLPT Level Selection */}
            <div>
              {/* A span, not a label: the control below is a button-based listbox
                  with its own aria-label, so there is no input to associate. */}
              <span className="mb-2 block text-sm font-medium">Your Japanese Level</span>
              <JlptLevelSelect value={jlptLevel} onChange={setJlptLevel} disabled={loading} />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 gradient-bg-primary text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-all duration-300 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Create Free Account
                </>
              )}
            </button>

            <p className="text-center text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              By creating an account, you agree to our{" "}
              <Link
                href="/terms"
                className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
              >
                Terms &amp; Conditions
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
