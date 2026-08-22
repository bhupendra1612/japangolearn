import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { Suspense } from "react";
import { Providers } from "@/components/providers";
import "@japangolearn/ui/styles.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

const siteUrl = "https://japangolearn.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "JapanGoLearn — Learn Japanese the Modern Way",
    template: "%s | JapanGoLearn",
  },
  description:
    "Master Japanese with visual learning, animated kanji strokes, gamification, and AI-powered practice. Follow the JLPT path from N5 to N1. Free to start.",
  keywords: [
    "learn japanese",
    "learn japanese online",
    "japanese language course",
    "JLPT",
    "JLPT N5",
    "JLPT N4",
    "JLPT N3",
    "JLPT N2",
    "JLPT N1",
    "kanji",
    "hiragana",
    "katakana",
    "japanese vocabulary",
    "japanese grammar",
    "japanese for beginners",
    "gamified japanese learning",
    "AI japanese tutor",
    "animated kanji strokes",
    "japanese app",
  ],
  authors: [{ name: "JapanGoLearn", url: siteUrl }],
  creator: "JapanGoLearn",
  publisher: "JapanGoLearn",
  applicationName: "JapanGoLearn",
  category: "Education",
  // No default canonical here on purpose. A root-level canonical is inherited by
  // every route that does not set its own, which silently pointed those pages at
  // the home page and made them unindexable. Each route declares its own.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "JapanGoLearn",
    title: "JapanGoLearn — Learn Japanese the Modern Way",
    description:
      "Master Japanese with visual learning, gamification, and AI practice. Free JLPT N5 to N1 structured path.",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "JapanGoLearn — Learn Japanese the Modern Way",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@japangolearn",
    creator: "@japangolearn",
    title: "JapanGoLearn — Learn Japanese the Modern Way",
    description:
      "Master Japanese with visual learning, gamification, and AI practice. Free JLPT N5 to N1.",
    images: [`${siteUrl}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    // Add your Google Search Console verification token here when ready:
    // google: "YOUR_GOOGLE_VERIFICATION_TOKEN",
  },
};

// JSON-LD Structured Data
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "@id": `${siteUrl}/#organization`,
  name: "JapanGoLearn",
  url: siteUrl,
  logo: {
    "@type": "ImageObject",
    url: `${siteUrl}/japangolearn_logo.webp`,
    width: 280,
    height: 80,
  },
  description:
    "JapanGoLearn is a modern Japanese language learning platform featuring animated kanji strokes, gamification, AI-powered conversation practice, and a structured JLPT N5 to N1 curriculum.",
  foundingDate: "2024",
  inLanguage: "en",
  teaches: "Japanese Language",
  educationalCredentialAwarded: "JLPT Proficiency",
  sameAs: ["https://japangolearn.com"],
  contactPoint: {
    "@type": "ContactPoint",
    email: "support@japangolearn.com",
    contactType: "customer support",
    availableLanguage: ["English", "Japanese"],
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  url: siteUrl,
  name: "JapanGoLearn",
  description: "Learn Japanese the Modern Way — JLPT N5 to N1",
  publisher: { "@id": `${siteUrl}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/blog?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

// Course/ItemList structured data lives on the home page, where it is built from
// the levels that actually have content. Emitting it from the root layout put it
// on every route (including /privacy) and hard-coded five levels as available.

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* JSON-LD Structured Data for SEO & AI Models */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      {/*
        Unified Fixed Dark Theme:
        - "bg-[#0b0f19]" gives a dense, premium dark navy base (UK Learning style)
        - Text is explicitly white / light gray.
      */}
      <body
        className={`${inter.variable} ${notoSansJp.variable} font-sans antialiased bg-[#0b0f19] text-white`}
        suppressHydrationWarning
      >
        <Suspense>
          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  );
}
