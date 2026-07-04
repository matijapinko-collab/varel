"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export function DealsFilters({
  locale,
  facets,
  current,
}: {
  locale: Locale;
  facets: { brands: string[]; categories: string[] };
  current: { category?: string; brand?: string; sort?: string; discount?: string };
}) {
  const router = useRouter();
  const t = getDictionary(locale);

  function update(key: string, value: string) {
    const params = new URLSearchParams();
    const next = { ...current, [key]: value };
    for (const [k, v] of Object.entries(next)) {
      if (v && v !== "all" && v !== "0") params.set(k, v);
    }
    const qs = params.toString();
    router.push(`/${locale}/best-deals${qs ? `?${qs}` : ""}`);
  }

  const selectCls =
    "h-10 cursor-pointer rounded-full border border-border bg-card px-3 text-sm text-muted outline-none hover:text-foreground focus:border-primary";

  return (
    <div className="flex flex-wrap gap-2">
      <select className={selectCls} value={current.category ?? "all"} onChange={(e) => update("category", e.target.value)}>
        <option value="all">{t.all_categories}</option>
        {facets.categories.map((c) => (
          <option key={c} value={c}>{c.replace(/-/g, " ")}</option>
        ))}
      </select>
      {facets.brands.length > 0 && (
        <select className={selectCls} value={current.brand ?? "all"} onChange={(e) => update("brand", e.target.value)}>
          <option value="all">{t.all_brands}</option>
          {facets.brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      )}
      <select className={selectCls} value={current.discount ?? "0"} onChange={(e) => update("discount", e.target.value)}>
        <option value="0">{t.min_discount}: 0%</option>
        <option value="10">10%+</option>
        <option value="25">25%+</option>
        <option value="50">50%+</option>
      </select>
      <select className={selectCls} value={current.sort ?? "newest"} onChange={(e) => update("sort", e.target.value)}>
        <option value="newest">{t.sort_by}: {t.sort_newest}</option>
        <option value="discount">{t.sort_discount}</option>
        <option value="price">{t.sort_price}</option>
        <option value="rating">{t.sort_rating}</option>
      </select>
    </div>
  );
}
