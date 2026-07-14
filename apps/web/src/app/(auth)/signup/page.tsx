"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { BookOpen, Mail, Lock, User, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";

const jlptOptions = [
  { value: "N5", label: "N5 — Complete Beginner", desc: "I'm just starting" },
  { value: "N4", label: "N4 — Elementary", desc: "I know hiragana & katakana" },
  { value: "N3", label: "N3 — Intermediate", desc: "I can have basic conversations" },
  { value: "N2", label: "N2 — Upper-Intermediate", desc: "I can read articles" },
  { value: "N1", label: "N1 — Advanced", desc: "I want native-level fluency" },
];

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [jlptLevel, setJlptLevel] = useState("N5");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          display_name: name,
          current_jlpt_level: jlptLevel,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-surface-dark relative overflow-hidden px-4">
        <div className="absolute inset-0 gradient-bg-hero" />
        <div className="relative text-center max-w-md animate-scale-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-bg-primary text-white mb-6">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Check your email! 📧</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We&apos;ve sent a confirmation link to <strong>{email}</strong>. Click the link to
            verify your account and start learning Japanese!
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 gradient-bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-all"
          >
            Go to Login
          </Link>
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
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl gradient-bg-primary text-white">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold gradient-text">JapanGoLearn</span>
          </Link>
          <p className="mt-3 text-gray-500 dark:text-gray-400">
            Start your Japanese journey today — for free!
          </p>
        </div>

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
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* JLPT Level Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Your Japanese Level</label>
              <div className="grid grid-cols-1 gap-2">
                {jlptOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                      jlptLevel === option.value
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-500"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="jlpt"
                      value={option.value}
                      checked={jlptLevel === option.value}
                      onChange={(e) => setJlptLevel(e.target.value)}
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                        jlptLevel === option.value
                          ? "gradient-bg-primary text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                      }`}
                    >
                      {option.value}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{option.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{option.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
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
