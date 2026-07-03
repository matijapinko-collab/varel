"use client";

import { useState } from "react";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

export function NewsletterForm({
  locale,
  compact = false,
  source = "site",
}: {
  locale: Locale;
  compact?: boolean;
  source?: string;
}) {
  const t = getDictionary(locale);
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get("email");
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale, source }),
      });
      setState(res.ok ? "success" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return <p className="text-sm font-medium text-primary">{t.newsletter_success}</p>;
  }

  return (
    <form onSubmit={onSubmit} className={compact ? "flex gap-2" : "mx-auto flex max-w-md gap-2"}>
      <input
        type="email"
        name="email"
        required
        placeholder={t.newsletter_placeholder}
        className="h-11 w-full min-w-0 flex-1 rounded-full border border-border bg-card px-4 text-sm outline-none transition-colors focus:border-primary"
      />
      <button
        type="submit"
        disabled={state === "loading"}
        className="h-11 shrink-0 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {t.newsletter_button}
      </button>
      {state === "error" && (
        <p className="text-sm text-red-500">{t.newsletter_error}</p>
      )}
    </form>
  );
}
