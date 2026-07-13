import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Main crawlers — allow everything public
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/auth/", "/api/"],
      },
      // Google AI (Gemini, Google Discover)
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: ["/dashboard/", "/auth/", "/api/"],
      },
      // OpenAI / ChatGPT
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/dashboard/", "/auth/", "/api/"],
      },
      // Anthropic Claude
      {
        userAgent: "anthropic-ai",
        allow: "/",
        disallow: ["/dashboard/", "/auth/", "/api/"],
      },
      // Perplexity AI
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/dashboard/", "/auth/", "/api/"],
      },
      // Meta AI
      {
        userAgent: "FacebookBot",
        allow: "/",
        disallow: ["/dashboard/", "/auth/", "/api/"],
      },
      // Apple AI
      {
        userAgent: "Applebot-Extended",
        allow: "/",
        disallow: ["/dashboard/", "/auth/", "/api/"],
      },
    ],
    sitemap: "https://japangolearn.com/sitemap.xml",
    host: "https://japangolearn.com",
  };
}
