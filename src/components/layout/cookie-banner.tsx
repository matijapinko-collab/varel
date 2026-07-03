"use client";

import { useEffect, useState } from "react";

const CONSENT_COOKIE = "varel-cookie-consent";

export function CookieBanner({ text, accept }: { text: string; accept: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!document.cookie.includes(`${CONSENT_COOKIE}=`));
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl flex-col items-center gap-3 rounded-card border border-border bg-card p-4 shadow-lg sm:flex-row">
      <p className="flex-1 text-sm text-muted">{text}</p>
      <button
        type="button"
        onClick={() => {
          document.cookie = `${CONSENT_COOKIE}=1;path=/;max-age=31536000;samesite=lax`;
          setVisible(false);
        }}
        className="h-10 shrink-0 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        {accept}
      </button>
    </div>
  );
}
