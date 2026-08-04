import type { Metadata } from "next";
import { Newsreader, Archivo, IBM_Plex_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

// SIT MarkEase design system — matching aims-deck.html exactly (Newsreader
// display serif, Archivo sans, IBM Plex Mono captions/data). Previously
// loaded only on the landing page/review console/feedback page, each
// re-declaring these same fonts locally; every other page used Space
// Grotesk/Inter/JetBrains Mono. Promoted here so the whole app shares one
// font system, matching the palette promotion in globals.css. Variable
// names kept as --font-serif/--font-sans/--font-mono for continuity with
// existing font-serif/font-sans/font-mono usages — see tailwind.config.ts.
const displayFont = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
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
      <body className="min-h-screen bg-canvas font-sans text-body">{children}</body>
    </html>
  );
}
