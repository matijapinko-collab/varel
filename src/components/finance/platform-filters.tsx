"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type Current = {
  q: string;
  sort: string;
  rating: string;
  beginner: boolean;
  demo: boolean;
  mobile: boolean;
};

export function PlatformFilters({ basePath, current }: { basePath: string; current: Current }) {
  const router = useRouter();

  function apply(next: Partial<Current>) {
    const merged = { ...current, ...next };
    const params = new URLSearchParams();
    if (merged.q) params.set("q", merged.q);
    if (merged.sort && merged.sort !== "rating") params.set("sort", merged.sort);
    if (merged.rating && merged.rating !== "0") params.set("rating", merged.rating);
    if (merged.beginner) params.set("beginner", "1");
    if (merged.demo) params.set("demo", "1");
    if (merged.mobile) params.set("mobile", "1");
    const qs = params.toString();
    router.push(`${basePath}${qs ? `?${qs}` : ""}`);
  }

  const selectCls =
    "h-10 cursor-pointer rounded-full border border-border bg-card px-3 text-sm text-muted outline-none hover:text-foreground focus:border-primary";
  const chipCls = (active: boolean) =>
    `h-10 rounded-full border px-4 text-sm font-medium transition-colors ${
      active ? "border-primary bg-soft text-primary" : "border-border bg-card text-muted hover:text-foreground"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: String(new FormData(e.currentTarget).get("q") ?? "") });
        }}
      >
        <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          name="q"
          defaultValue={current.q}
          placeholder="Search…"
          className="h-10 w-48 rounded-full border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </form>
      <select className={selectCls} value={current.rating} onChange={(e) => apply({ rating: e.target.value })}>
        <option value="0">Any rating</option>
        <option value="4">4.0+</option>
        <option value="4.5">4.5+</option>
      </select>
      <button type="button" className={chipCls(current.beginner)} onClick={() => apply({ beginner: !current.beginner })}>
        Beginner-friendly
      </button>
      <button type="button" className={chipCls(current.demo)} onClick={() => apply({ demo: !current.demo })}>
        Demo account
      </button>
      <button type="button" className={chipCls(current.mobile)} onClick={() => apply({ mobile: !current.mobile })}>
        Mobile app
      </button>
      <select className={selectCls} value={current.sort} onChange={(e) => apply({ sort: e.target.value })}>
        <option value="rating">Sort: Best rated</option>
        <option value="newest">Newest</option>
        <option value="name">Name A–Z</option>
      </select>
    </div>
  );
}
