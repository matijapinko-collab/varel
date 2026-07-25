import { unstable_cache, revalidateTag } from "next/cache";

/**
 * Cross-request caching for public content reads.
 *
 * The public site is rendered dynamically (the root layout reads the theme
 * cookie), so every visit used to re-run ~14 DB queries against a single-
 * connection pool — a 5.5s homepage. React's `cache()` only dedupes within one
 * request; `unstable_cache` persists results across requests and survives cold
 * lambdas, so a warm page serves without touching the database.
 *
 * Everything cached here is public, published content — never per-user data,
 * never anything that reads cookies/headers (unstable_cache runs outside the
 * request scope and cannot).
 *
 * All entries share one tag. Every content mutation already calls
 * revalidatePath("/", "layout") to refresh the public site; revalidateSiteContent()
 * is called right beside it, so a publish busts the cache immediately. The
 * revalidate window is only a safety net for anything that slips through.
 */

export const SITE_CONTENT_TAG = "site-content";

const DEFAULT_REVALIDATE_SECONDS = 300;

/**
 * Wraps a public-content loader so its result is cached across requests and
 * tagged for invalidation. `keyParts` must uniquely name the function — the
 * loader's actual arguments are appended automatically by unstable_cache.
 */
export function cachePublic<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  keyParts: string[],
  revalidate: number = DEFAULT_REVALIDATE_SECONDS
): (...args: A) => Promise<R> {
  return unstable_cache(fn, keyParts, { tags: [SITE_CONTENT_TAG], revalidate });
}

/**
 * Drops every cached public-content entry. Call after any content mutation.
 *
 * Next 16's `revalidateTag` type now demands a cache-life profile (the Cache
 * Components model), but this project uses the previous model — `unstable_cache`
 * with tags — where the documented call is single-arg and works at runtime.
 * The cast pins that documented signature.
 */
const purgeTag = revalidateTag as (tag: string) => void;

export function revalidateSiteContent(): void {
  purgeTag(SITE_CONTENT_TAG);
}
