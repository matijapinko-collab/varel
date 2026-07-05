"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { PriceCheckerResponse, PriceCheckerResult } from "@/lib/price-checker/types";
import { ProductCard } from "./product-card";

type Copy = {
  searchPlaceholder: string;
  noResultsMessage: string;
  errorMessage: string;
  unavailableMessage: string;
};

type Status = "idle" | "loading" | "success" | "empty" | "error" | "unavailable" | "invalid";

const EXAMPLES = [
  "Sony WH-1000XM5",
  "Logitech MX Master 3S",
  "MacBook Air M3",
  "Kindle Paperwhite",
];

/** Fire-and-forget internal analytics event. */
function track(type: string, metadata: Record<string, unknown>) {
  try {
    const payload = JSON.stringify({
      type,
      entityType: "PRICE_CHECKER",
      path: window.location.pathname,
      metadata,
    });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", payload);
    else
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
  } catch {
    // ignore
  }
}

export function PriceChecker({ copy, available }: { copy: Copy; available: boolean }) {
  const [query, setQuery] = useState("");
  const [country] = useState("DE");
  const [status, setStatus] = useState<Status>(available ? "idle" : "unavailable");
  const [results, setResults] = useState<PriceCheckerResult[]>([]);
  const [exampleIdx, setExampleIdx] = useState(0);
  const [focused, setFocused] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Rotate placeholder examples while the field is empty and unfocused.
  useEffect(() => {
    if (query || focused) return;
    const id = setInterval(() => setExampleIdx((i) => (i + 1) % EXAMPLES.length), 2600);
    return () => clearInterval(id);
  }, [query, focused]);

  const placeholder =
    query || focused ? copy.searchPlaceholder : `${copy.searchPlaceholder}  e.g. ${EXAMPLES[exampleIdx]}`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!available) {
      setStatus("unavailable");
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setStatus("invalid");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setResults([]);

    try {
      const res = await fetch("/api/price-checker/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, country }),
        signal: controller.signal,
      });

      if (res.status === 503) {
        setStatus("unavailable");
        return;
      }
      if (res.status === 400) {
        setStatus("invalid");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }

      const data = (await res.json()) as PriceCheckerResponse;
      if (!data.results || data.results.length === 0) {
        setResults([]);
        setStatus("empty");
        return;
      }
      setResults(data.results);
      setStatus("success");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setStatus("error");
    }
  }

  function onSelect(product: PriceCheckerResult, position: number) {
    track("OUTBOUND_CLICK", {
      event: "price_checker_result_click",
      query: query.trim(),
      country,
      marketplace: "amazon.de",
      productTitle: product.title,
      productId: product.id,
      position,
    });
    track("AFFILIATE_CLICK", {
      event: "affiliate_click",
      sourcePage: "price-checker",
      productTitle: product.title,
      marketplace: "amazon.de",
      affiliateNetwork: "Amazon",
      position,
    });
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            maxLength={120}
            aria-label="Search Amazon.de products"
            className="h-14 w-full rounded-full border border-border bg-card py-3.5 pl-11 pr-4 text-base outline-none transition-colors focus:border-primary"
          />
        </div>
        <div className="flex gap-3">
          <select
            aria-label="Country"
            value={country}
            disabled
            className="h-14 rounded-full border border-border bg-card px-4 text-sm text-muted"
          >
            <option value="DE">Germany — Amazon.de</option>
          </select>
          <button
            type="submit"
            disabled={status === "loading" || !available}
            className="inline-flex h-14 items-center justify-center rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {status === "loading" ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {status === "invalid" && (
        <p className="mt-3 text-center text-sm text-muted">
          Please enter at least 2 characters.
        </p>
      )}

      <div className="mt-8">
        {status === "loading" && <SkeletonGrid />}

        {status === "unavailable" && (
          <Notice>{copy.unavailableMessage}</Notice>
        )}
        {status === "error" && <Notice>{copy.errorMessage}</Notice>}
        {status === "empty" && <Notice>{copy.noResultsMessage}</Notice>}

        {status === "success" && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((product, i) => (
              <ProductCard key={product.id} product={product} position={i} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl rounded-card border border-border bg-background-secondary px-6 py-8 text-center text-muted">
      {children}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div>
      <p className="mb-4 text-center text-sm text-muted">Searching Amazon.de…</p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-card border border-border bg-card">
            <div className="h-44 animate-pulse bg-background-secondary" />
            <div className="space-y-2 p-4">
              <div className="h-3 w-2/3 animate-pulse rounded bg-background-secondary" />
              <div className="h-3 w-full animate-pulse rounded bg-background-secondary" />
              <div className="h-5 w-1/3 animate-pulse rounded bg-background-secondary" />
              <div className="h-10 w-full animate-pulse rounded-full bg-background-secondary" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
