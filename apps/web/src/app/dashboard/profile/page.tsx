import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  User,
  Mail,
  Calendar,
  Star,
  Flame,
  Target,
  Trophy,
  Shield,
  Activity,
  Clock,
  Zap,
  TrendingUp,
  Award,
  Lock,
} from "lucide-react";
import { ProgressRing } from "@/components/dashboard/progress-ring";
import { AvatarUpload, ProfileEditForm } from "@/components/dashboard/profile-edit-form";

export const dynamic = "force-dynamic";

function getXpLevel(xp: number): {
  level: number;
  current: number;
  needed: number;
} {
  let level = 1;
  let remaining = xp;
  while (remaining >= level * 100) {
    remaining -= level * 100;
    level++;
  }
  return { level, current: remaining, needed: level * 100 };
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { count: achievementCount },
    { count: activityCount },
    { data: recentActivities },
    { data: userAchievements },
    { data: allAchievements },
    { data: activityDates },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "display_name, avatar_url, role, current_jlpt_level, xp, streak_days, created_at, last_active_at"
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("user_achievements")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("activity_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("activity_log")
      .select("type, title, xp_earned, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("user_achievements").select("achievement_id").eq("user_id", user.id),
    supabase.from("achievements").select("id, name, icon, xp_reward"),
    supabase
      .from("activity_log")
      .select("created_at")
      .eq("user_id", user.id)
      .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Learner";
  const email = user.email ?? "";
  const xp = profile?.xp ?? 0;
  const streak = profile?.streak_days ?? 0;
  const currentLevel = profile?.current_jlpt_level ?? "N5";
  const role = profile?.role ?? "user";
  const avatarUrl = profile?.avatar_url || null;
  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "—";
  const lastActive = profile?.last_active_at
    ? new Date(profile.last_active_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Never";
  const xpLevel = getXpLevel(xp);
  const badges = achievementCount ?? 0;
  const activities = activityCount ?? 0;

  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Build achievement showcase
  const unlockedIds = new Set(userAchievements?.map((ua) => ua.achievement_id) ?? []);
  const unlockedAchievements =
    allAchievements?.filter((a) => unlockedIds.has(a.id)).slice(0, 6) ?? [];
  const lockedAchievements =
    allAchievements?.filter((a) => !unlockedIds.has(a.id)).slice(0, 3) ?? [];

  // Build 90-day heatmap data
  const heatmapData: Record<string, number> = {};
  activityDates?.forEach((a) => {
    const day = a.created_at.split("T")[0];
    heatmapData[day] = (heatmapData[day] || 0) + 1;
  });

  const heatmapDays: { date: string; count: number; dayOfWeek: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().split("T")[0];
    heatmapDays.push({
      date: dateStr,
      count: heatmapData[dateStr] || 0,
      dayOfWeek: d.getDay(),
    });
  }

  const activityIcons: Record<string, string> = {
    vocabulary: "📚",
    writing: "✍️",
    grammar: "📖",
    kana: "🔤",
    quiz: "🎯",
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-6 animate-slide-up">
        <Link href="/dashboard" className="hover:text-primary-600 transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-medium text-gray-900 dark:text-gray-100">Profile</span>
      </div>

      {/* ───── Profile Header ───── */}
      <section className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 mb-6 animate-slide-up">
        {/* Banner gradient with pattern */}
        <div className="h-32 sm:h-40 w-full relative overflow-hidden">
          <div className="absolute inset-0 gradient-bg-primary" />
          <div className="absolute inset-0 jp-pattern opacity-10" />
          {/* Decorative floating kanji */}
          <div className="absolute top-4 right-6 text-6xl sm:text-8xl font-jp text-white/5 font-bold select-none">
            学
          </div>
          <div className="absolute bottom-2 left-8 text-4xl sm:text-5xl font-jp text-white/5 font-bold select-none">
            道
          </div>
        </div>

        <div className="px-5 sm:px-8 pb-6">
          {/* Avatar + info row */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14 sm:-mt-16 mb-6">
            <AvatarUpload currentUrl={avatarUrl} initials={initials} />

            <div className="flex-1 min-w-0 pt-2">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{displayName}</h1>
                {role === "admin" && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 flex-wrap text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Joined {joinDate}
                </span>
              </div>
              <div className="mt-3">
                <ProfileEditForm displayName={displayName} jlptLevel={currentLevel} />
              </div>
            </div>

            {/* XP Level ring */}
            <div className="shrink-0 hidden sm:block">
              <ProgressRing
                progress={(xpLevel.current / xpLevel.needed) * 100}
                size={88}
                strokeWidth={6}
                gradientId="profile-level-ring"
              >
                <div className="text-center">
                  <p className="text-xl font-bold gradient-text">{xpLevel.level}</p>
                  <p className="text-[9px] text-gray-400 uppercase tracking-wider">Level</p>
                </div>
              </ProgressRing>
            </div>
          </div>

          {/* XP Progress bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-yellow-500" />
                Level {xpLevel.level} Progress
              </span>
              <span className="font-medium">
                {xpLevel.current}/{xpLevel.needed} XP
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full gradient-bg-primary transition-all duration-1000 ease-out"
                style={{
                  width: `${(xpLevel.current / xpLevel.needed) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              {
                icon: Star,
                label: "Total XP",
                value: xp.toLocaleString(),
                color: "text-yellow-500",
                bg: "bg-yellow-50 dark:bg-yellow-900/20",
              },
              {
                icon: Flame,
                label: "Streak",
                value: `${streak}d`,
                color: "text-orange-500",
                bg: "bg-orange-50 dark:bg-orange-900/20",
              },
              {
                icon: Target,
                label: "JLPT",
                value: currentLevel,
                color: "text-primary-500",
                bg: "bg-primary-50 dark:bg-primary-900/20",
              },
              {
                icon: Trophy,
                label: "Badges",
                value: badges,
                color: "text-cyan-500",
                bg: "bg-cyan-50 dark:bg-cyan-900/20",
              },
              {
                icon: Activity,
                label: "Activities",
                value: activities,
                color: "text-emerald-500",
                bg: "bg-emerald-50 dark:bg-emerald-900/20",
              },
            ].map((s, i) => (
              <div
                key={s.label}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-sm font-bold">{s.value}</p>
                  <p className="text-[10px] text-gray-400">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── 90-Day Activity Heatmap ───── */}
      <section
        className="p-5 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 mb-6 animate-slide-up"
        style={{ animationDelay: "0.1s" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            Activity — Last 90 Days
          </h2>
          <span className="text-xs text-gray-400">
            {Object.keys(heatmapData).length} active days
          </span>
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-[3px] min-w-[500px]">
            {/* Group into weeks */}
            {Array.from({ length: Math.ceil(heatmapDays.length / 7) }).map((_, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-[3px]">
                {heatmapDays.slice(weekIdx * 7, weekIdx * 7 + 7).map((day) => {
                  const intensity =
                    day.count === 0 ? 0 : day.count <= 2 ? 1 : day.count <= 5 ? 2 : 3;
                  const colors = [
                    "bg-gray-100 dark:bg-gray-700/50",
                    "bg-primary-200 dark:bg-primary-800/60",
                    "bg-primary-400 dark:bg-primary-600",
                    "bg-primary-600 dark:bg-primary-400",
                  ];
                  return (
                    <div
                      key={day.date}
                      className={`w-3 h-3 rounded-sm ${colors[intensity]} transition-colors hover:ring-2 hover:ring-primary-400 hover:ring-offset-1 dark:hover:ring-offset-gray-800`}
                      title={`${day.date}: ${day.count} activities`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-gray-400 justify-end">
          <span>Less</span>
          {[
            "bg-gray-100 dark:bg-gray-700/50",
            "bg-primary-200 dark:bg-primary-800/60",
            "bg-primary-400 dark:bg-primary-600",
            "bg-primary-600 dark:bg-primary-400",
          ].map((c, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
          <span>More</span>
        </div>
      </section>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* ───── Recent Activity ───── */}
        <section
          className="p-5 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 animate-slide-up"
          style={{ animationDelay: "0.15s" }}
        >
          <h2 className="font-bold text-base mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-500" />
            Recent Activity
          </h2>
          {recentActivities && recentActivities.length > 0 ? (
            <div className="space-y-2.5">
              {recentActivities.map((act, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group"
                >
                  <span className="text-lg shrink-0">{activityIcons[act.type] ?? "📝"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {act.title}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(act.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {act.xp_earned > 0 && (
                    <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 flex items-center gap-0.5 shrink-0">
                      <Star className="w-3 h-3" />+{act.xp_earned}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm text-gray-400">No activity yet</p>
              <p className="text-xs text-gray-400 mt-1">Start learning to build your history!</p>
            </div>
          )}
        </section>

        {/* ───── Account Details ───── */}
        <section
          className="p-5 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 animate-slide-up"
          style={{ animationDelay: "0.2s" }}
        >
          <h2 className="font-bold text-base mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-500" />
            Account Details
          </h2>
          <div className="space-y-3">
            {[
              { label: "Display Name", value: displayName, icon: "👤" },
              { label: "Email", value: email, icon: "📧" },
              {
                label: "Role",
                value: role.charAt(0).toUpperCase() + role.slice(1),
                icon: "🛡️",
              },
              { label: "Member Since", value: joinDate, icon: "📅" },
              { label: "Last Active", value: lastActive, icon: "⏰" },
              {
                label: "Current Level",
                value: `JLPT ${currentLevel}`,
                icon: "🎯",
              },
              {
                label: "XP Level",
                value: `Level ${xpLevel.level}`,
                icon: "⚡",
              },
              {
                label: "XP to Next Level",
                value: `${xpLevel.current}/${xpLevel.needed}`,
                icon: "📊",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 -mx-2 px-2 rounded-lg transition-colors"
              >
                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span className="text-base">{row.icon}</span>
                  {row.label}
                </span>
                <span className="text-sm font-medium">{row.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ───── Achievement Showcase ───── */}
      <section
        className="p-5 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 mb-6 animate-slide-up"
        style={{ animationDelay: "0.25s" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-500" />
            Achievements
          </h2>
          <Link
            href="/dashboard/achievements"
            className="text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors"
          >
            View All →
          </Link>
        </div>

        {unlockedAchievements.length > 0 || lockedAchievements.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {unlockedAchievements.map((ach) => (
              <div
                key={ach.id}
                className="group flex flex-col items-center gap-1.5 p-3 rounded-xl bg-primary-50/50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-800/30 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">
                  {ach.icon}
                </span>
                <p className="text-[10px] font-semibold text-center leading-tight line-clamp-2">
                  {ach.name}
                </p>
                <span className="text-[9px] text-yellow-600 dark:text-yellow-400 font-bold flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5" />+{ach.xp_reward}
                </span>
              </div>
            ))}
            {lockedAchievements.map((ach) => (
              <div
                key={ach.id}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-[10px] font-medium text-gray-400 text-center leading-tight line-clamp-2">
                  {ach.name}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-3xl mb-2">🏆</p>
            <p className="text-sm text-gray-400">Complete activities to unlock achievements!</p>
          </div>
        )}
      </section>

      {/* ───── Motivational Footer ───── */}
      <div className="mt-8 mb-4 text-center animate-slide-up" style={{ animationDelay: "0.3s" }}>
        <p className="text-sm text-gray-400 dark:text-gray-500 font-jp">
          一期一会 — One lifetime, one encounter.
        </p>
      </div>
    </div>
  );
}
