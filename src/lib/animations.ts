import type { Variants } from "framer-motion";

/**
 * Shared animation tokens + variants for the premium homepage motion system.
 * All variants animate only `transform` and `opacity` (GPU-friendly, no layout
 * shift). Components gate these behind `useReducedMotion()` so reduced-motion
 * users get plain, static content. See globals.css for the CSS safety net.
 */

// Expensive, decisive easing used across the whole system.
export const premiumEase = [0.22, 1, 0.36, 1] as const;

export const duration = {
  micro: 0.18,
  base: 0.4,
  slow: 0.6,
  hero: 0.7,
} as const;

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.slow, ease: premiumEase } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: premiumEase } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: duration.slow, ease: premiumEase } },
};

/** Parent that reveals its children with a stagger. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.base + 0.1, ease: premiumEase } },
};

/** Section reveal used on scroll-into-view (once). */
export const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: premiumEase } },
};

/** Reduced-motion equivalents: opacity only, no movement. */
export const reducedItem: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};
