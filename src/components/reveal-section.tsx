"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

// Scroll-triggered fade/slide-in for a whole section. Applied at section
// granularity, not per-child — per-child stagger is opted into separately
// via `stagger` where it visibly earns its keep (e.g. a 3-card grid).
export function RevealSection({
  children,
  className = "",
  stagger = false,
  id,
}: {
  children: ReactNode;
  className?: string;
  stagger?: boolean;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {stagger ? (
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        >
          {children}
        </motion.div>
      ) : (
        children
      )}
    </motion.section>
  );
}

export function RevealItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
