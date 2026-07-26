import { unstable_cache, updateTag, revalidateTag } from "next/cache";

/**
 * Cross-request caching for public content reads.
 *
 * React's `cache()` only dedupes within one request; `unstable_cache` persists
 * results in the Data Cache across requests and cold lambdas. Public routes
 * are additionally served from the Full Route Cache (the root layout no longer
 * reads cookies), so these loaders normally run only when a page regenerates.
 *
 * Everything cached here is public, published content — never per-user data,
 * never anything that reads cookies/headers (unstable_cache runs outside the
 * request scope and cannot).
 *
 * Serialization note: the Data Cache stores JSON, so `Date` fields come back
 * as ISO strings on cache hits. Consumers that format dates must wrap the
 * value in `new Date(...)` (works for both the fresh `Date` and the cached
 * string) — see the news block and the deal card.
 *
 * All entries share one tag. Invalidation is context-specific in Next 16:
 *   - Server Actions call `updateSiteContent()` (updateTag → immediate expiry
 *     plus read-your-own-writes within the action's response).
 *   - Route Handlers (cron, webhooks) call `expireSiteContent()` — updateTag
 *     is not allowed there, so they use the documented two-argument
 *     `revalidateTag(tag, "max")`, which expires the entries with
 *     stale-while-revalidate semantics.
 * The `revalidate` window is only a safety net for anything that slips
 * through.
 */

export const SITE_CONTENT_TAG = "site-content";

const DEFAULT_REVALIDATE_SECONDS = 300;

/**
 * Wraps a public-content loader so its result is cached across requests and
 * tagged for invalidation. `keyParts` must uniquely name the function — the
 * loader's actual arguments are appended automatically by unstable_cache.
 *
 * Every real execution of the callback logs `[site-cache-miss]` with the
 * loader name — after warm-up a given key must NOT log on every request; if it
 * does, the cache identity is broken. The log carries no query text, no
 * personal data and no secrets.
 */
export function cachePublic<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  keyParts: string[],
  revalidate: number = DEFAULT_REVALIDATE_SECONDS
): (...args: A) => Promise<R> {
  const instrumented = async (...args: A): Promise<R> => {
    console.info("[site-cache-miss]", {
      loader: keyParts[0] ?? "unknown",
      arg: typeof args[0] === "string" ? args[0] : undefined,
      build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8),
    });
    return fn(...args);
  };
  return unstable_cache(instrumented, keyParts, {
    tags: [SITE_CONTENT_TAG],
    revalidate,
  });
}

/**
 * Drops every cached public-content entry from a Server Action. Call after a
 * successful content mutation, never before it and never from a read path.
 */
export function updateSiteContent(): void {
  updateTag(SITE_CONTENT_TAG);
}

/**
 * Drops every cached public-content entry from a Route Handler (cron,
 * webhook). Server Actions must use updateSiteContent() instead.
 */
export function expireSiteContent(): void {
  revalidateTag(SITE_CONTENT_TAG, "max");
}
