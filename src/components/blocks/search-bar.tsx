"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { premiumEase } from "@/lib/animations";
import type { Locale } from "@/lib/i18n/config";

export function SearchBar({
  locale,
  placeholder,
  suggestions = [],
  large = false,
  animateChips = false,
}: {
  locale: Locale;
  placeholder: string;
  suggestions?: string[];
  large?: boolean;
  animateChips?: boolean;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    if (q) router.push(`/${locale}/search?q=${encodeURIComponent(q)}`);
  }

  const chipContainer: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduce ? 0 : 0.07, delayChildren: 0.15 } },
  };
  const chipItem: Variants = reduce
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: premiumEase } },
      };

  const chipClass =
    "rounded-full border border-border bg-card px-3 py-1 text-xs text-muted transition-all hover:-translate-y-px hover:border-primary hover:bg-soft hover:text-primary";

  return (
    <div className={large ? "mx-auto w-full max-w-2xl" : "w-full"}>
      <form onSubmit={onSubmit} className="relative">
        <Search
          size={large ? 20 : 16}
          className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted transition-colors peer-focus:text-primary"
        />
        <input
          type="search"
          name="q"
          placeholder={placeholder}
          className={`peer w-full rounded-full border border-border bg-card shadow-sm outline-none transition-all focus:border-primary focus:shadow-[0_0_0_4px_var(--search-glow)] ${
            large ? "h-14 pl-12 pr-4 text-base" : "h-11 pl-10 pr-4 text-sm"
          }`}
        />
      </form>
      {suggestions.length > 0 &&
        (animateChips ? (
          <motion.div
            className="mt-3 flex flex-wrap items-center justify-center gap-2"
            variants={chipContainer}
            initial="hidden"
            animate="visible"
          >
            {suggestions.map((s) => (
              <motion.button
                key={s}
                variants={chipItem}
                type="button"
                onClick={() => router.push(`/${locale}/search?q=${encodeURIComponent(s)}`)}
                className={chipClass}
              >
                {s}
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => router.push(`/${locale}/search?q=${encodeURIComponent(s)}`)}
                className={chipClass}
              >
                {s}
              </button>
            ))}
          </div>
        ))}
    </div>
  );
}
