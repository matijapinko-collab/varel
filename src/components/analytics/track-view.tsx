"use client";

import { useEffect } from "react";

/** Fires an internal analytics event once when the page mounts. */
export function TrackView({
  type,
  entityType,
  entityId,
  locale,
}: {
  type: string;
  entityType?: string;
  entityId?: string;
  locale: string;
}) {
  useEffect(() => {
    const payload = JSON.stringify({
      type,
      entityType,
      entityId,
      languageCode: locale,
      path: window.location.pathname,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", payload);
    } else {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }, [type, entityType, entityId, locale]);

  return null;
}
