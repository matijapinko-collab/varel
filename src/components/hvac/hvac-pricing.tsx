"use client";

import { useState } from "react";
import { Check, X, Star } from "lucide-react";
import {
  hvacPackages, hvacPricing, contractOrder, contractToggleLabels, contractLabels,
  VAT_NOTE, type ContractKey, type PackageId,
} from "@/lib/hvac/content";
import { formatEur } from "@/lib/hvac/format";
import { hvacTrack } from "@/lib/hvac/track";

function selectPlan(plan: string) {
  hvacTrack(`hvac_${plan.toLowerCase()}_cta_click`);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hvac:selectplan", { detail: plan }));
    document.getElementById("rani-pristup")?.scrollIntoView({ behavior: "smooth" });
  }
}

function PackageCard({ id, contract }: { id: PackageId; contract: ContractKey }) {
  const pkg = hvacPackages.find((p) => p.id === id)!;
  const price = hvacPricing[id][contract];

  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-card p-6 ${
        pkg.highlighted ? "border-sky-500 shadow-lg shadow-sky-500/10 ring-1 ring-sky-500/30" : "border-border"
      }`}
    >
      {pkg.badge && (
        <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-3 py-1 text-xs font-semibold text-white">
          <Star size={12} /> {pkg.badge}
        </span>
      )}
      <h3 className="text-lg font-bold">{pkg.name}</h3>
      <p className="mt-1 text-sm text-muted">{pkg.tagline}</p>

      <div className="mt-5">
        <span className="text-4xl font-bold tabular-nums">{formatEur(price)}</span>
        <span className="text-muted"> mjesečno</span>
      </div>
      <p className="mt-1 text-xs text-muted">{contractLabels[contract]}</p>
      <p className="mt-0.5 text-xs font-medium text-sky-600 dark:text-sky-300">{pkg.technicians}</p>

      <button
        type="button"
        onClick={() => selectPlan(pkg.name.replace("Varel ", ""))}
        className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-opacity ${
          pkg.highlighted
            ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow hover:opacity-90"
            : "border border-border hover:border-sky-500/50"
        }`}
      >
        {pkg.cta}
      </button>

      <ul className="mt-6 space-y-2 text-sm">
        {pkg.features.map((f) => (
          <li key={f} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-sky-500" /> {f}</li>
        ))}
        {pkg.excluded.map((f) => (
          <li key={f} className="flex items-start gap-2 text-muted"><X size={15} className="mt-0.5 shrink-0 text-slate-400" /> {f}</li>
        ))}
      </ul>

      {pkg.note && (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-700 dark:text-amber-300">{pkg.note}</p>
      )}
    </div>
  );
}

export function HvacPricing() {
  const [contract, setContract] = useState<ContractKey>("annual12");

  function change(next: ContractKey) {
    setContract(next);
    hvacTrack("hvac_package_selector_change", { contract: next });
  }

  return (
    <section id="paketi" className="scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">Paketi</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Odaberite paket prema veličini svog tima</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted">
            Uštedite više uz dužu ugovornu obvezu ili odaberite fleksibilno mjesečno plaćanje.
          </p>
          <p className="mt-2 text-sm font-medium text-sky-600 dark:text-sky-300">
            Već od {formatEur(hvacPricing.solo.annual24)} mjesečno uz ugovor na 24 mjeseca.
          </p>
        </div>

        {/* Contract toggle */}
        <div className="mt-8 flex justify-center">
          <div role="radiogroup" aria-label="Trajanje ugovora" className="inline-flex rounded-xl border border-border bg-card p-1">
            {contractOrder.map((key) => (
              <button
                key={key}
                role="radio"
                aria-checked={contract === key}
                onClick={() => change(key)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 ${
                  contract === key ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white" : "text-muted hover:text-foreground"
                }`}
              >
                {contractToggleLabels[key]}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-center text-sm text-muted">{contractLabels[contract]}</p>

        <div className="mt-8 grid items-start gap-5 lg:grid-cols-3">
          {hvacPackages.map((p) => <PackageCard key={p.id} id={p.id} contract={contract} />)}
        </div>

        <p className="mt-6 text-center text-sm font-medium text-muted">{VAT_NOTE}</p>
      </div>
    </section>
  );
}
