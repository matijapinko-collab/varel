"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { premiumEase } from "@/lib/animations";

export function MobileNav({ items }: { items: { label: string; url: string }[] }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  const panel: Variants = reduce
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        hidden: { opacity: 0, y: -8 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.28, ease: premiumEase, staggerChildren: 0.04, delayChildren: 0.05 },
        },
        exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: premiumEase } },
      };
  const listItem: Variants = reduce
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } };

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:text-foreground active:scale-95"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "close" : "open"}
            initial={{ opacity: 0, rotate: reduce ? 0 : -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: reduce ? 0 : 90 }}
            transition={{ duration: 0.2, ease: premiumEase }}
            className="inline-flex"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </motion.span>
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 top-16 z-40 bg-foreground/5 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.nav
              className="absolute inset-x-0 top-16 z-50 border-b border-border bg-background p-4 shadow-lg"
              variants={panel}
              initial="hidden"
              animate="visible"
              exit="exit"
              aria-label="Mobile"
            >
              {items.map((item) => (
                <motion.div key={item.url + item.label} variants={listItem}>
                  <Link
                    href={item.url}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-soft active:scale-[0.99]"
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
