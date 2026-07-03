"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";

export function SearchBar({
  locale,
  placeholder,
  suggestions = [],
  large = false,
}: {
  locale: Locale;
  placeholder: string;
  suggestions?: string[];
  large?: boolean;
}) {
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    if (q) router.push(`/${locale}/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className={large ? "mx-auto w-full max-w-2xl" : "w-full"}>
      <form onSubmit={onSubmit} className="relative">
        <Search
          size={large ? 20 : 16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          name="q"
          placeholder={placeholder}
          className={`w-full rounded-full border border-border bg-card shadow-sm outline-none transition-all focus:border-primary focus:shadow-md ${
            large ? "h-14 pl-12 pr-4 text-base" : "h-11 pl-10 pr-4 text-sm"
          }`}
        />
      </form>
      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => router.push(`/${locale}/search?q=${encodeURIComponent(s)}`)}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted transition-colors hover:border-primary hover:text-primary"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
