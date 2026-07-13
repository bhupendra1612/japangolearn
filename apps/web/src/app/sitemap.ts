import type { MetadataRoute } from "next";

const baseUrl = "https://japangolearn.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Static marketing pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/disclaimer`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    // Auth pages (indexable but lower priority)
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    // Hiragana & Katakana — high SEO value
    {
      url: `${baseUrl}/hiragana`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/katakana`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.95,
    },
    // Vocabulary — high SEO value
    {
      url: `${baseUrl}/vocabulary`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    ...["n5", "n4", "n3", "n2", "n1"].map((level) => ({
      url: `${baseUrl}/vocabulary/level/${level}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
  ];

  return staticRoutes;
}
