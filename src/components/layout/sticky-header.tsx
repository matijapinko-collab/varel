"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { premiumEase } from "@/lib/animations";

/**
 * Header shell: premium entrance on load + sticky scroll transition
 * (background/blur/border strengthen once the page is scrolled). The inner
 * content (logo, nav, controls) is server-rendered and passed as children.
 */
export function StickyHeader({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      data-scrolled={scrolled}
      initial={reduce ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: premiumEase, delay: 0.05 }}
      className="sticky top-0 z-40 border-b border-transparent bg-background/60 backdrop-blur-md transition-[background-color,backdrop-filter,border-color] duration-200 data-[scrolled=true]:border-border data-[scrolled=true]:bg-background/85 data-[scrolled=true]:backdrop-blur-xl"
    >
      {children}
    </motion.header>
  );
}
