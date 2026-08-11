import type { Metadata } from "next";
import { Space_Grotesk, Archivo, IBM_Plex_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { MeshBackground } from "@/components/mesh-background";

// SIT MarkEase design system — ember-dark reskin. Display font is Space
// Grotesk (geometric/technical, matching the "futuristic AI SaaS" reskin;
// replaces the previous humanist-serif Newsreader). Archivo sans and IBM
// Plex Mono unchanged — Plex Mono already suits data-readout styling.
// Variable names kept as --font-serif/--font-sans/--font-mono for
// continuity with existing font-serif/font-sans/font-mono usages — see
// tailwind.config.ts.
const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});
const sansFont = Archivo({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans", display: "swap" });
const monoFont = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "SIT MarkEase",
  description: "SIT MarkEase — AI-assisted assessment diagnosis. Built at SIT.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${sansFont.variable} ${monoFont.variable}`}>
      <body className="min-h-screen bg-canvas font-sans text-body">
        <MeshBackground />
        {children}
      </body>
    </html>
  );
}
