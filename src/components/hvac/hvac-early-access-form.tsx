"use client";

import { useEffect, useRef, useState } from "react";
import { teamSizeOptions, currentSystemOptions, interestedPlanOptions } from "@/lib/hvac/content";
import { hvacTrack } from "@/lib/hvac/track";

type Values = {
  fullName: string; company: string; email: string; phone: string;
  teamSize: string; city: string; currentSystem: string; interestedPlan: string; message: string;
  consent: boolean; website: string;
};

const EMPTY: Values = {
  fullName: "", company: "", email: "", phone: "", teamSize: "", city: "",
  currentSystem: "", interestedPlan: "", message: "", consent: false, website: "",
};

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
      {children}{required && <span className="text-red-500"> *</span>}
    </label>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-sky-500";

export function HvacEarlyAccessForm({ sourcePage = "/hvac" }: { sourcePage?: string }) {
  const [v, setV] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const started = useRef(false);

  // Pre-select the package chosen from the pricing cards.
  useEffect(() => {
    const handler = (e: Event) => {
      const plan = (e as CustomEvent<string>).detail;
      if (interestedPlanOptions.includes(plan)) setV((s) => ({ ...s, interestedPlan: plan }));
    };
    window.addEventListener("hvac:selectplan", handler);
    return () => window.removeEventListener("hvac:selectplan", handler);
  }, []);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    if (!started.current) { started.current = true; hvacTrack("hvac_early_access_form_start"); }
    setV((s) => ({ ...s, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof Values, string>> = {};
    if (v.fullName.trim().length < 2) e.fullName = "Ovo polje je obavezno";
    if (v.company.trim().length < 2) e.company = "Ovo polje je obavezno";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "Unesite ispravnu e-mail adresu";
    if (!v.consent) e.consent = "Potrebna je privola za obradu podataka";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setState("loading");
    try {
      const res = await fetch("/api/hvac/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, sourcePage }),
      });
      if (!res.ok) { setState("error"); return; }
      hvacTrack("hvac_early_access_form_submit", { plan: v.interestedPlan || "nije_odabrano" });
      setState("success");
      setV(EMPTY);
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-2xl border border-sky-500/40 bg-sky-500/5 p-8 text-center">
        <h3 className="text-xl font-bold">Hvala na prijavi. Javit ćemo vam se uskoro.</h3>
        <p className="mt-2 text-muted">Uskoro ćemo vas kontaktirati s više informacija o Varel HVAC ranom pristupu.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="fullName" required>Ime i prezime</Label>
          <input id="fullName" className={inputCls} value={v.fullName} onChange={(e) => set("fullName", e.target.value)} aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? "err-fullName" : undefined} />
          {errors.fullName && <p id="err-fullName" className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
        </div>
        <div>
          <Label htmlFor="company" required>Naziv obrta ili tvrtke</Label>
          <input id="company" className={inputCls} value={v.company} onChange={(e) => set("company", e.target.value)} aria-invalid={!!errors.company} aria-describedby={errors.company ? "err-company" : undefined} />
          {errors.company && <p id="err-company" className="mt-1 text-xs text-red-500">{errors.company}</p>}
        </div>
        <div>
          <Label htmlFor="email" required>Poslovni e-mail</Label>
          <input id="email" type="email" className={inputCls} value={v.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "err-email" : undefined} />
          {errors.email && <p id="err-email" className="mt-1 text-xs text-red-500">{errors.email}</p>}
        </div>
        <div>
          <Label htmlFor="phone">Broj telefona</Label>
          <input id="phone" type="tel" className={inputCls} value={v.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="teamSize">Broj majstora</Label>
          <select id="teamSize" className={inputCls} value={v.teamSize} onChange={(e) => set("teamSize", e.target.value)}>
            <option value="">Odaberite</option>
            {teamSizeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="city">Grad ili područje rada</Label>
          <input id="city" className={inputCls} value={v.city} onChange={(e) => set("city", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="currentSystem">Kako danas vodite termine</Label>
          <select id="currentSystem" className={inputCls} value={v.currentSystem} onChange={(e) => set("currentSystem", e.target.value)}>
            <option value="">Odaberite</option>
            {currentSystemOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="interestedPlan">Paket koji vas najviše zanima</Label>
          <select id="interestedPlan" className={inputCls} value={v.interestedPlan} onChange={(e) => set("interestedPlan", e.target.value)}>
            <option value="">Odaberite</option>
            {interestedPlanOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor="message">Poruka (opcionalno)</Label>
        <textarea id="message" rows={3} className={inputCls} value={v.message} onChange={(e) => set("message", e.target.value)} />
      </div>

      {/* Honeypot — visually hidden, ignored by humans */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden" tabIndex={-1}>
        <label htmlFor="website">Ne ispunjavajte ovo polje</label>
        <input id="website" tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => setV((s) => ({ ...s, website: e.target.value }))} />
      </div>

      <div className="mt-4">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={v.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 h-4 w-4 accent-sky-500" aria-invalid={!!errors.consent} />
          <span>Slažem se da Varel obradi moje podatke radi kontakta o Varel HVAC ranom pristupu.</span>
        </label>
        {errors.consent && <p className="mt-1 text-xs text-red-500">{errors.consent}</p>}
      </div>

      {state === "error" && (
        <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">
          Došlo je do pogreške. Pokušajte ponovno.
        </p>
      )}

      <button
        type="submit"
        disabled={state === "loading"}
        className="mt-5 w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg shadow-sky-500/20 hover:opacity-90 disabled:opacity-60 sm:w-auto"
      >
        {state === "loading" ? "Šaljem…" : "Prijavite se za rani pristup"}
      </button>
    </form>
  );
}
