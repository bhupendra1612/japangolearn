import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { BRAND } from "@japangolearn/content";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "@japangolearn/ui/styles.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

/** Used for IDs, table keys, and other values that benefit from fixed width. */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: `Admin | ${BRAND.name}`,
  description: "Admin panel for JapanGoLearn learning content and users.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /* Matches the themed page background so the mobile browser chrome does not
     stay white above a dark console. */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0e16" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* suppressHydrationWarning: the inline script below sets data-theme on this
       element before React hydrates, so the server and client markup differ by
       design. */
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
