/**
 * Estimated reading time in whole minutes.
 *
 * Lifted out of post-article.tsx so the server can store it at save time and
 * the library can filter on it — a listing of 200 posts must not parse 200
 * article bodies to render a "5 min" chip.
 */

const WORDS_PER_MINUTE = 220;

export function wordsToMinutes(html: string | null | undefined): number {
  const text = (html ?? "").replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
