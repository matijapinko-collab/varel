"use client";

import { usePathname, useRouter } from "next/navigation";
import { Globe } from "lucide-react";

const LOCALE_COOKIE = "varel-locale";

export function LanguageSwitcher({
  current,
  languages,
}: {
  current: string;
  languages: { code: string; nativeName: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(code: string) {
    document.cookie = `${LOCALE_COOKIE}=${code};path=/;max-age=31536000;samesite=lax`;
    const segments = pathname.split("/");
    segments[1] = code;
    // Language-switch analytics event (fire and forget)
    navigator.sendBeacon?.(
      "/api/track",
      JSON.stringify({ type: "LANGUAGE_SWITCH", languageCode: code, path: pathname })
    );
    router.push(segments.join("/") || `/${code}`);
  }

  if (languages.length <= 1) return null;

  return (
    <div className="relative inline-flex items-center">
      <Globe size={14} className="pointer-events-none absolute left-2.5 text-muted" />
      <select
        aria-label="Language"
        value={current}
        onChange={(e) => switchTo(e.target.value)}
        className="h-9 cursor-pointer appearance-none rounded-full border border-border bg-transparent pl-8 pr-3 text-sm text-muted transition-colors hover:text-foreground focus:outline-none"
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code}>
            {l.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
