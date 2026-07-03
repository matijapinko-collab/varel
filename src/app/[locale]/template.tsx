"use client";

import { motion, useReducedMotion } from "framer-motion";
import { premiumEase } from "@/lib/animations";

/**
 * Subtle page transition — a quick opacity fade on every in-app navigation.
 * Next.js re-mounts this template per navigation. Opacity only (no movement)
 * to avoid layout shift and any scroll jump. Disabled under reduced motion.
 */
export default function LocaleTemplate({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: premiumEase }}
    >
      {children}
    </motion.div>
  );
}
