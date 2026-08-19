"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { JLPT_SIGNUP_LEVELS } from "@japangolearn/content";

/**
 * Japanese-level picker for signup.
 *
 * The web previously rendered all five levels as an always-open radio stack,
 * which pushed the submit button below the fold on a phone. This matches the
 * mobile app: a collapsed trigger showing the current choice, opening a list.
 *
 * Built on a button + listbox rather than a native <select> so the level badge
 * and description survive — a native option element cannot carry them.
 */
export function JlptLevelSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  const selected =
    JLPT_SIGNUP_LEVELS.find((level) => level.value === value) ?? JLPT_SIGNUP_LEVELS[0];
  const activeIndex = JLPT_SIGNUP_LEVELS.findIndex((level) => level.value === selected.value);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  };

  /* Arrow keys move through the levels without opening the list, which is what
     a native select does and what screen-reader users expect here. */
  const onTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = Math.min(JLPT_SIGNUP_LEVELS.length - 1, Math.max(0, activeIndex + delta));
      onChange(JLPT_SIGNUP_LEVELS[nextIndex].value);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={`Your Japanese level: ${selected.label}`}
        className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
      >
        <span className="gradient-bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white">
          {selected.value}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{selected.label}</span>
          <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
            {selected.desc}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Your Japanese level"
          className="animate-scale-in absolute left-0 right-0 z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-900"
        >
          {JLPT_SIGNUP_LEVELS.map((level) => {
            const active = level.value === selected.value;
            return (
              <li key={level.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => choose(level.value)}
                  className={`flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors ${
                    active
                      ? "bg-primary-50 dark:bg-primary-900/30"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      active
                        ? "gradient-bg-primary text-white"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                    }`}
                  >
                    {level.value}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-sm font-medium ${
                        active ? "text-primary-700 dark:text-primary-300" : ""
                      }`}
                    >
                      {level.label}
                    </span>
                    <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                      {level.desc}
                    </span>
                  </span>
                  {active && (
                    <Check
                      className="h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
