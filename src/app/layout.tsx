import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

// Design-system v2 — bold, geometric display type (matching SIT's own
// blocky wordmark) instead of v1's delicate Instrument Serif. Free Google
// Fonts, self-hosted by next/font at build time (no runtime CDN
// dependency). Variable name kept as --font-serif for continuity with
// existing `font-serif` usages across components — see tailwind.config.ts.
const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-serif",
  display: "swap",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Practica",
  description: "Practica — AI-assisted assessment diagnosis. Built at SIT (AIMS: AI for Individualised Mastery Support).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-canvas font-sans text-body">{children}</body>
    </html>
  );
}
