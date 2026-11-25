import type { Database, Kanji } from "@japangolearn/database";

export type HomeActivity = Pick<
  Database["public"]["Tables"]["activity_log"]["Row"],
  "id" | "type" | "title" | "created_at" | "xp_earned" | "metadata"
>;
export type StudyArea = "vocabulary" | "kanji" | "grammar" | "writing";
export const STUDY_MINUTES = [5, 10, 15] as const;
export type StudyMinutes = (typeof STUDY_MINUTES)[number];
export const studyAreaLabels: Record<StudyArea, string> = {
  vocabulary: "Vocabulary",
  kanji: "Kanji",
  grammar: "Grammar",
  writing: "Kana & writing",
};

/** Activity metadata is data, never a route supplied to the router. */
export function activityStudyArea(
  activity: Pick<HomeActivity, "type" | "metadata">
): StudyArea | null {
  const metadata = activity.metadata;
  const type =
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata) &&
    typeof metadata.activity_type === "string"
      ? metadata.activity_type
      : activity.type;
  if (/^(vocabulary|kanji|grammar)(?:_|$)/.test(type)) return type.split("_")[0] as StudyArea;
  if (/^(kana|writing|hiragana|katakana)(?:_|$)/.test(type)) return "writing";
  return null;
}

export function continueStudyArea(activities: readonly HomeActivity[]): StudyArea | null {
  for (const activity of activities) {
    const area = activityStudyArea(activity);
    if (area) return area;
  }
  return null;
}

export function studyPlan(
  minutes: StudyMinutes
): { area: StudyArea; minutes: number; task: string }[] {
  if (minutes === 5)
    return [
      { area: "writing", minutes: 2, task: "Warm up with a few kana" },
      { area: "vocabulary", minutes: 3, task: "Say five words out loud" },
    ];
  if (minutes === 10)
    return [
      { area: "vocabulary", minutes: 4, task: "Revisit words you want to remember" },
      { area: "kanji", minutes: 3, task: "Try a quick-recall round" },
      { area: "grammar", minutes: 3, task: "Read one pattern and its examples" },
    ];
  return [
    { area: "writing", minutes: 3, task: "Practise kana and their stroke order" },
    { area: "vocabulary", minutes: 5, task: "Listen, repeat, and recall" },
    { area: "kanji", minutes: 4, task: "Explore a few unfamiliar characters" },
    { area: "grammar", minutes: 3, task: "Read one pattern and its examples" },
  ];
}

export function parseStudyMinutes(value: unknown): StudyMinutes {
  return value === 5 || value === 15 ? value : 10;
}

export function dailyKanji(items: readonly Kanji[], now: Date): Kanji | undefined {
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
  return items.length ? items[day % items.length] : undefined;
}

export function goalProgress(earned: number, target: number) {
  const safeEarned = Number.isFinite(earned) ? Math.max(0, earned) : 0;
  const safeTarget = Number.isFinite(target) && target > 0 ? target : 100;
  return {
    earned: safeEarned,
    target: safeTarget,
    ratio: Math.min(safeEarned / safeTarget, 1),
    remaining: Math.max(0, safeTarget - safeEarned),
  };
}

export function activityAge(value: string, now: Date): string {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Recent activity";
  const minutes = Math.max(0, Math.floor((now.getTime() - time) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  const days = Math.floor(minutes / 1440);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}
