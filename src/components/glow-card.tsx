"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

// Reusable glass + gradient-ring card. Replaces the repeated
// "rounded-lg border border-hairline bg-surface-card" pattern with the
// futuristic glass treatment; `hover` adds a small lift + glow, kept to
// GPU-cheap transform/box-shadow only.
export function GlowCard({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      className={`glass-card glow-border ${className}`}
      whileHover={hover ? { y: -2, boxShadow: "var(--glow-primary)" } : undefined}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
