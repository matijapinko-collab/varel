"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { hvacFaq } from "@/lib/hvac/content";
import { hvacTrack } from "@/lib/hvac/track";

export function HvacFaq() {
  const [open, setOpen] = useState<number | null>(0);

  function toggle(i: number) {
    setOpen((cur) => {
      const next = cur === i ? null : i;
      if (next === i) hvacTrack("hvac_faq_expand", { index: i });
      return next;
    });
  }

  return (
    <section id="faq" className="scroll-mt-20 border-t border-border bg-background-secondary">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-center text-sm font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">Česta pitanja</p>
        <h2 className="mt-2 text-center text-3xl font-bold tracking-tight sm:text-4xl">Sve što vas zanima o Varel HVAC-u</h2>

        <div className="mt-8 divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
          {hvacFaq.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <h3>
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    id={`faq-q-${i}`}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold hover:bg-soft/60"
                  >
                    <span>{item.q}</span>
                    <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                </h3>
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-q-${i}`}
                  hidden={!isOpen}
                  className="px-5 pb-4 text-sm text-muted"
                >
                  {item.a}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
