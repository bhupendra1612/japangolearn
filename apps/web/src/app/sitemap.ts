import type { MetadataRoute } from "next";
import { JLPT_LEVELS, getCurriculumStats, hasContent } from "@/lib/curriculum";
import { courseCatalogEnabled } from "@/lib/marketplace";
import { createStaticClient } from "@/lib/supabase/static";

const baseUrl = "https://japangolearn.com";

/**
 * Must match the slug derivation in the vocabulary topic route, otherwise the
 * sitemap advertises URLs that resolve to 404.
 */
function topicSlug(topic: string) {
  return topic.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

async function vocabularyTopicEntries(lastModified: Date): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = createStaticClient();
    const { data } = await supabase.from("vocabulary").select("topic");
    const topics = [...new Set((data ?? []).map((row) => row.topic).filter(Boolean))];

    return topics.map((topic) => ({
      url: `${baseUrl}/vocabulary/topic/${topicSlug(topic)}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));
  } catch {
    return [];
  }
}

async function courseEntries(): Promise<MetadataRoute.Sitemap> {
  if (!courseCatalogEnabled) return [];

  try {
    const supabase = createStaticClient();
    const { data } = await supabase
      .from("courses")
      .select("slug, updated_at, published_at")
      .eq("status", "published");

    return (data ?? []).map((course) => ({
      url: `${baseUrl}/courses/${course.slug}`,
      lastModified: new Date(course.updated_at ?? course.published_at ?? Date.now()),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    ...(courseCatalogEnabled
      ? [
          {
            url: `${baseUrl}/courses`,
            lastModified: now,
            changeFrequency: "daily" as const,
            priority: 0.95,
          },
        ]
      : []),
    { url: `${baseUrl}/hiragana`, lastModified: now, changeFrequency: "monthly", priority: 0.95 },
    { url: `${baseUrl}/katakana`, lastModified: now, changeFrequency: "monthly", priority: 0.95 },
    { url: `${baseUrl}/vocabulary`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/disclaimer`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Only submit a JLPT level once it has content. An empty level page is thin
  // content, and submitting it invites a quality penalty on the whole section.
  // Seeding a level makes its URL appear here automatically.
  const stats = await getCurriculumStats();
  const levelRoutes: MetadataRoute.Sitemap = JLPT_LEVELS.filter(({ level }) =>
    hasContent(stats.byLevel[level])
  ).map(({ level }) => ({
    url: `${baseUrl}/vocabulary/level/${level.toLowerCase()}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  const [topicRoutes, courseRoutes] = await Promise.all([
    vocabularyTopicEntries(now),
    courseEntries(),
  ]);

  return [...staticRoutes, ...levelRoutes, ...topicRoutes, ...courseRoutes];
}
