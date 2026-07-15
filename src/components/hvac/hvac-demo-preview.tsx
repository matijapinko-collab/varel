"use client";

import { useState } from "react";
import Link from "next/link";
import { hvacDemoRoles, HVAC_ROUTES } from "@/lib/hvac/content";
import { hvacTrack } from "@/lib/hvac/track";

export function HvacDemoPreview() {
  const [active, setActive] = useState(0);
  const role = hvacDemoRoles[active];

  return (
    <section id="demo" className="scroll-mt-20 border-y border-border bg-background-secondary">
      <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">Demo</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Isprobajte Varel HVAC bez registracije</h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted">
          Otvorite interaktivno demo okruženje i provjerite kako izgleda upravljanje klijentima, klima-uređajima, terminima, majstorima i radnim nalozima.
        </p>

        {/* Role tabs */}
        <div role="tablist" aria-label="Demo uloge" className="mt-8 inline-flex flex-wrap justify-center gap-1 rounded-xl border border-border bg-card p-1">
          {hvacDemoRoles.map((r, i) => (
            <button
              key={r.role}
              role="tab"
              id={`demo-tab-${i}`}
              aria-selected={active === i}
              aria-controls={`demo-panel-${i}`}
              onClick={() => setActive(i)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${active === i ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white" : "text-muted hover:text-foreground"}`}
            >
              {r.role}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`demo-panel-${active}`}
          aria-labelledby={`demo-tab-${active}`}
          className="mx-auto mt-6 max-w-xl rounded-card border border-border bg-card p-6 text-left"
        >
          <h3 className="font-semibold">{role.title}</h3>
          <p className="mt-1.5 text-sm text-muted">{role.text}</p>
        </div>

        <div className="mt-8">
          <Link
            href={HVAC_ROUTES.demo}
            onClick={() => hvacTrack("hvac_demo_section_cta_click")}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg shadow-sky-500/20 hover:opacity-90"
          >
            Otvori interaktivni demo
          </Link>
          <p className="mt-4 text-sm text-muted">
            Demo koristi izmišljene podatke. Promjene ne utječu na stvarne korisnike i mogu se automatski resetirati.
          </p>
        </div>
      </div>
    </section>
  );
}
