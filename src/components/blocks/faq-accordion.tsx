"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function FaqAccordion({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-border rounded-card border border-border bg-card">
      {items.map((item, i) => (
        <div key={i}>
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium hover:text-primary"
            aria-expanded={open === i}
          >
            {item.question}
            <ChevronDown
              size={16}
              className={`shrink-0 text-muted transition-transform ${open === i ? "rotate-180" : ""}`}
            />
          </button>
          {open === i && (
            <div className="px-5 pb-4 text-sm leading-relaxed text-muted">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
