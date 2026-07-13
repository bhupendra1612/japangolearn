"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/hiragana", label: "Hiragana" },
  { href: "/katakana", label: "Katakana" },
  { href: "/vocabulary", label: "Vocabulary" },
  { href: "/blog", label: "Blog" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0b0f19]/70 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] transition-all">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/japangolearn_logo.webp"
              alt="JapanGoLearn Logo"
              width={140}
              height={40}
              className="h-10 w-auto object-contain brightness-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-primary-400 after:to-accent-400 after:transition-all after:duration-300 hover:after:w-full"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden sm:inline-flex text-sm font-medium text-gray-300 hover:text-white transition-colors px-2 py-2"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-accent-600 px-5 py-2.5 rounded-xl hover:opacity-90 hover:scale-105 transition-all duration-300 neon-glow"
            >
              Sign up free
            </Link>

            {/* Mobile menu */}
            <button
              className="md:hidden p-2 rounded-xl text-gray-300 hover:text-white bg-white/5"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/5 py-4 animate-slide-up bg-[#0b0f19] absolute top-16 left-0 w-full px-4 shadow-2xl">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-gray-300 hover:text-white px-3 py-3 rounded-lg hover:bg-white/5 transition-all"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="h-px bg-white/5 my-1" />
              <Link
                href="/login"
                className="text-sm font-medium text-gray-300 hover:text-white px-3 py-3 rounded-lg hover:bg-white/5 transition-all"
                onClick={() => setMobileOpen(false)}
              >
                Log in
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
