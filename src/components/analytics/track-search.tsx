"use client";

import { useEffect } from "react";

export function TrackSearch({
  query,
  resultCount,
  locale,
}: {
  query: string;
  resultCount: number;
  locale: string;
}) {
  useEffect(() => {
    const payload = JSON.stringify({
      type: "SEARCH",
      languageCode: locale,
      path: window.location.pathname,
      metadata: { query, resultCount },
    });
    navigator.sendBeacon?.("/api/track", payload);
  }, [query, resultCount, locale]);
  return null;
}
