"use client";

import Link from "next/link";
import { OPEN_PREFERENCES_EVENT } from "@/lib/consent";
import { legalSlug } from "@/lib/legal";

/**
 * Footer links: "Cookie Settings" reopens the consent modal; "Privacy Choices"
 * points to the Privacy Policy (US privacy-rights section). Localized labels
 * for EN/HR, English elsewhere.
 */
export function ConsentFooterLinks({ locale }: { locale: string }) {
  const cookieSettings = locale === "hr" ? "Postavke kolačića" : "Cookie Settings";
  const privacyChoices = locale === "hr" ? "Postavke privatnosti" : "Privacy Choices";
  const privacyHref = `/${locale}/${legalSlug("privacy", locale)}`;

  return (
    <>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent(OPEN_PREFERENCES_EVENT))}
        className="text-left text-sm text-muted transition-colors hover:text-foreground"
      >
        {cookieSettings}
      </button>
      <Link
        href={privacyHref}
        className="text-sm text-muted transition-colors hover:text-foreground"
      >
        {privacyChoices}
      </Link>
    </>
  );
}
