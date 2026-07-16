"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

type Service = { id: string; name: string };

/**
 * Public booking request form for a tenant's hosted page. Posts to
 * /api/hvac-booking/[slug]; no auth. Includes a honeypot + consent checkbox.
 */
export function BookingForm({ slug, services, accent }: { slug: string; services: Service[]; accent?: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: fd.get("name"), phone: fd.get("phone"), email: fd.get("email"),
      address: fd.get("address"), city: fd.get("city"), serviceId: fd.get("serviceId"),
      preferredDate: fd.get("preferredDate"), preferredTimeRange: fd.get("preferredTimeRange"),
      deviceCount: fd.get("deviceCount") ? Number(fd.get("deviceCount")) : undefined,
      manufacturer: fd.get("manufacturer"), issueDescription: fd.get("issueDescription"),
      consent: fd.get("consent") === "on", website: fd.get("website") ?? "",
    };
    if (!payload.consent) { setError("Molimo potvrdite privolu za obradu podataka."); return; }
    setStatus("sending");
    try {
      const res = await fetch(`/api/hvac-booking/${slug}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (res.ok) { setStatus("done"); form.reset(); return; }
      const data = await res.json().catch(() => ({}));
      setError(data?.error === "rate_limited" ? "Previše zahtjeva. Pokušajte ponovno za nekoliko minuta." : "Slanje nije uspjelo. Pokušajte ponovno.");
      setStatus("error");
    } catch {
      setError("Slanje nije uspjelo. Provjerite vezu i pokušajte ponovno.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={40} />
        <h3 className="text-lg font-semibold">Zahtjev je zaprimljen</h3>
        <p className="mt-1 text-sm text-muted">Javit ćemo vam se u najkraćem roku radi potvrde termina.</p>
      </div>
    );
  }

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-sky-500";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px]" aria-hidden />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-sm font-medium">Ime i prezime *</span><input name="name" required className={inputCls} /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Telefon *</span><input name="phone" required inputMode="tel" className={inputCls} /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">E-mail *</span><input name="email" type="email" required className={inputCls} /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Grad</span><input name="city" className={inputCls} /></label>
        <label className="block sm:col-span-2"><span className="mb-1 block text-sm font-medium">Adresa</span><input name="address" className={inputCls} /></label>
        {services.length > 0 && (
          <label className="block"><span className="mb-1 block text-sm font-medium">Usluga</span>
            <select name="serviceId" defaultValue="" className={inputCls}>
              <option value="">— odaberite —</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        )}
        <label className="block"><span className="mb-1 block text-sm font-medium">Proizvođač uređaja</span><input name="manufacturer" placeholder="npr. Daikin, Mitsubishi" className={inputCls} /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Željeni datum</span><input name="preferredDate" type="date" className={inputCls} /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Dio dana</span>
          <select name="preferredTimeRange" defaultValue="" className={inputCls}>
            <option value="">— bilo kada —</option>
            <option value="Prijepodne">Prijepodne</option>
            <option value="Poslijepodne">Poslijepodne</option>
          </select>
        </label>
      </div>
      <label className="block"><span className="mb-1 block text-sm font-medium">Opis problema / zahtjeva</span><textarea name="issueDescription" rows={3} className={inputCls} /></label>

      <label className="flex items-start gap-2 text-sm text-muted">
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-sky-500" />
        <span>Suglasan/na sam s obradom mojih podataka radi kontakta i dogovora termina.</span>
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit" disabled={status === "sending"}
        className="w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        style={{ background: accent ?? "linear-gradient(to right, #0ea5e9, #06b6d4)" }}
      >
        {status === "sending" ? "Šaljem…" : "Pošalji zahtjev za termin"}
      </button>
    </form>
  );
}
