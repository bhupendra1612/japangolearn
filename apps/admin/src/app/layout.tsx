import type { Metadata } from "next";
import { BRAND } from "@japangolearn/content";
import "@japangolearn/ui/styles.css";
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
      <body>{children}</body>
    </html>
  );
}
