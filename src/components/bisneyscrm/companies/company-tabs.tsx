"use client";

import { useState, type ReactNode } from "react";

export type CompanyTab = { key: string; label: string; badge?: number; content: ReactNode };

/**
 * Client tab switcher for the company profile (Company Intelligence Faza 2).
 * All tab bodies are server-rendered and passed in as nodes; this component only
 * toggles which one is visible, so no data is re-fetched on tab change.
 */
export function CompanyTabs({ tabs }: { tabs: CompanyTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`-mb-px rounded-t-lg px-3 py-2 text-sm font-medium transition ${
              active === t.key ? "border-b-2 border-indigo-500 text-indigo-500" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className="ml-1.5 rounded-full bg-indigo-500/15 px-1.5 py-0.5 text-[11px] text-indigo-500">{t.badge}</span>
            )}
          </button>
        ))}
      </div>
      <div>{current?.content}</div>
    </div>
  );
}
