import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { BRAND } from "@japangolearn/content";
import "./globals.css";

export const metadata: Metadata = {
  title: `Admin | ${BRAND.name}`,
  description: "Admin panel for JapanGoLearn learning content and users.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
