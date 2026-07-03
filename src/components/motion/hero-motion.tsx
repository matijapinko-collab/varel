"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { SearchBar } from "@/components/blocks/search-bar";
import { BackgroundGlow } from "@/components/layout/background-glow";
import { premiumEase } from "@/lib/animations";
import type { Locale } from "@/lib/i18n/config";

/**
 * Animated hero: staggered entrance for title → subtitle → search on load.
 * Suggested-search chips animate inside <SearchBar>. Reduced motion collapses
 * to a simple opacity fade with no movement.
 */
export function HeroMotion({
  title,
  subtitle,
  searchPlaceholder,
  suggestions,
  locale,
  showSearch,
}: {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  suggestions: string[];
  locale: Locale;
  showSearch: boolean;
}) {
  const reduce = useReducedMotion();

  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: reduce ? 0 : 0.12, delayChildren: 0.1 },
    },
  };
  const item: Variants = reduce
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.3 } } }
    : {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: premiumEase } },
      };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-soft to-background px-4 pb-16 pt-20 text-center">
      <BackgroundGlow />
      <motion.div
        className="relative mx-auto max-w-3xl"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <motion.h1 variants={item} className="text-4xl font-bold tracking-tight sm:text-5xl">
          {title}
        </motion.h1>
        <motion.p variants={item} className="mx-auto mt-4 max-w-2xl text-lg text-muted">
          {subtitle}
        </motion.p>
        {showSearch && (
          <motion.div variants={item} className="mt-8">
            <SearchBar
              locale={locale}
              large
              placeholder={searchPlaceholder}
              suggestions={suggestions}
              animateChips
            />
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
