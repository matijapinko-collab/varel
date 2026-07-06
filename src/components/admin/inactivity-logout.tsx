"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

/**
 * Logs the admin out after `timeoutMinutes` of inactivity.
 *
 * Activity = mouse move / click, keyboard, scroll, touch, form input, and
 * route navigation (the effect re-runs on pathname change). On timeout the
 * session cookie is cleared and the user is sent to /administracija with a
 * "session expired" notice. All protected routes still require a valid session
 * server-side, so this is a UX layer on top of real auth.
 */
export function InactivityLogout({ timeoutMinutes }: { timeoutMinutes: number }) {
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ms = Math.max(1, timeoutMinutes) * 60_000;
    let lastActivity = Date.now();
    let lastReset = 0;

    const logout = () => {
      // Best-effort audit before the cookie is cleared.
      try {
        navigator.sendBeacon?.("/api/admin/session-expired");
      } catch {
        // ignore
      }
      signOut({ redirect: false }).finally(() => {
        window.location.href = "/administracija?reason=timeout";
      });
    };

    const reset = () => {
      lastActivity = Date.now();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logout, ms);
    };

    const onActivity = () => {
      const now = Date.now();
      // Throttle: at most one reset per second.
      if (now - lastReset < 1000) return;
      lastReset = now;
      reset();
    };

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "input",
    ];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    // If the tab was hidden past the timeout, log out on return.
    const onVisibility = () => {
      if (document.visibilityState === "visible" && Date.now() - lastActivity >= ms) {
        logout();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeoutMinutes, pathname]);

  return null;
}
