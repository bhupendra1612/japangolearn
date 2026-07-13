"use client";

import { Lock, CheckCircle2, PlayCircle, ChevronRight } from "lucide-react";
import { ProgressRing } from "./progress-ring";
import Link from "next/link";

export interface LevelData {
  id: string;
  kanji: string;
  name: string;
  description: string;
  total_kanji: number;
  total_vocabulary: number;
  total_grammar: number;
  color: string; // tailwind gradient classes
  progress: number; // 0–100
  status: "locked" | "active" | "completed";
  lessons_completed?: number;
  total_lessons?: number;
}

interface LevelCardProps {
  level: LevelData;
  index: number;
}

const STATUS_BADGE = {
  locked: { label: "Locked", icon: Lock, class: "bg-slate-200 dark:bg-gray-800 text-gray-400" },
  active: { label: "In Progress", icon: PlayCircle, class: "gradient-bg-primary text-white" },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    class: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
  },
};

export function LevelCard({ level, index }: LevelCardProps) {
  const isLocked = level.status === "locked";
  const isCompleted = level.status === "completed";
  const statusInfo = STATUS_BADGE[level.status];

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-300 ${
        isLocked
          ? "bg-slate-200/60 dark:bg-gray-800/30 border-slate-300 dark:border-gray-700 opacity-60"
          : isCompleted
            ? "bg-white/80 dark:bg-gray-800/60 border-green-200 dark:border-green-800 backdrop-blur-sm"
            : "bg-white/80 dark:bg-gray-800/60 border-primary-200 dark:border-primary-700 neon-glow backdrop-blur-sm"
      } ${!isLocked ? "hover:-translate-y-1 hover:shadow-xl cursor-pointer" : ""}`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Completed crown */}
      {isCompleted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl z-10 animate-bounce">
          👑
        </div>
      )}

      <div className="p-6">
        {/* Top row: kanji + progress ring */}
        <div className="flex items-center justify-between mb-5">
          {/* Kanji emblem */}
          <div
            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${level.color} text-white flex items-center justify-center text-3xl font-jp font-bold shrink-0 shadow-lg ${
              !isLocked
                ? "group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300"
                : "grayscale"
            }`}
          >
            {isLocked ? <Lock className="w-7 h-7 opacity-60" /> : level.kanji}
          </div>

          {/* Progress ring */}
          <ProgressRing
            progress={level.progress}
            size={72}
            strokeWidth={5}
            gradientId={`ring-${level.id}`}
          >
            <span className={`text-base font-bold ${isLocked ? "text-gray-400" : "gradient-text"}`}>
              {Math.round(level.progress)}%
            </span>
          </ProgressRing>
        </div>

        {/* Level name + badge */}
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-xl font-bold">{level.id}</h3>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${statusInfo.class} flex items-center gap-1`}
          >
            <statusInfo.icon className="w-3 h-3" />
            {statusInfo.label}
          </span>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {level.description}
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: "Kanji", value: level.total_kanji },
            { label: "Vocab", value: level.total_vocabulary.toLocaleString() },
            { label: "Grammar", value: level.total_grammar },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center py-2 rounded-xl bg-slate-50 dark:bg-gray-700/50"
            >
              <p className={`text-sm font-bold ${isLocked ? "text-gray-400" : ""}`}>{stat.value}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Lesson progress bar */}
        {!isLocked && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              <span>Lessons</span>
              <span className="font-semibold">
                {level.lessons_completed ?? 0}/{level.total_lessons ?? 0}
              </span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${level.color} transition-all duration-700`}
                style={{ width: `${level.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* CTA button */}
        {isLocked ? (
          <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-200 dark:bg-gray-700 text-gray-400 text-sm font-medium cursor-not-allowed">
            <Lock className="w-4 h-4" />
            Complete {["N5", "N4", "N3", "N2", "N1"][Math.max(0, index - 1)]} to unlock
          </div>
        ) : (
          <Link
            href={`/dashboard/levels`}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
              isCompleted
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
                : "gradient-bg-primary text-white hover:opacity-90"
            }`}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Review
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                {level.progress > 0 ? "Continue" : "Start Learning"}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Link>
        )}
      </div>
    </div>
  );
}
