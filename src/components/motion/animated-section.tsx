"use client";

import { motion, useReducedMotion } from "framer-motion";
import { premiumEase } from "@/lib/animations";

/**
 * Wraps a homepage section and reveals it once as it scrolls into view.
 * Server-rendered children are passed straight through (they stay in the DOM
 * and are readable by crawlers/screen readers). Reduced-motion users get the
 * content with no animation.
 */
export function AnimatedSection({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section";
}) {
  const reduce = useReducedMotion();
  const MotionTag = as === "section" ? motion.section : motion.div;

  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: premiumEase, delay }}
    >
      {children}
    </MotionTag>
  );
}
