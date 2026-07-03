"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  DENY_ALL,
  GRANT_ALL,
  OPEN_PREFERENCES_EVENT,
  hasGlobalPrivacySignal,
  readConsent,
  writeConsent,
  type ConsentCategories,
} from "@/lib/consent";
import { legalSlug } from "@/lib/legal";
import { getConsentCopy } from "./consent-text";

/**
 * Cookie consent: first-visit banner + preferences modal with per-category
 * toggles. Opt-in by default (optional cookies off until accepted). Reopened
 * from the footer "Cookie Settings" link via a window event.
 */
export function CookieConsent({ locale, enabled }: { locale: string; enabled: boolean }) {
  const copy = getConsentCopy(locale);
  const reduce = useReducedMotion();
  const [decided, setDecided] = useState(true); // assume decided until we read the cookie
  const [modalOpen, setModalOpen] = useState(false);
  const [gpc, setGpc] = useState(false);
  const [draft, setDraft] = useState<ConsentCategories>(DENY_ALL);

  useEffect(() => {
    const existing = readConsent();
    setGpc(hasGlobalPrivacySignal());
    if (existing) {
      setDraft(existing.categories);
      setDecided(true);
    } else {
      setDraft(DENY_ALL);
      setDecided(false); // show the banner
    }
    const openHandler = () => {
      const current = readConsent();
      if (current) setDraft(current.categories);
      setModalOpen(true);
    };
    window.addEventListener(OPEN_PREFERENCES_EVENT, openHandler);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, openHandler);
  }, []);

  const persist = useCallback((categories: ConsentCategories) => {
    writeConsent(categories);
    setDraft(categories);
    setDecided(true);
    setModalOpen(false);
  }, []);

  // Never block admin; setting can hide it entirely.
  if (!enabled) return null;

  const cookiePolicyHref = `/${locale}/${legalSlug("cookie", locale)}`;
  const showBanner = !decided && !modalOpen;

  const Toggle = ({
    category,
    checked,
    disabled,
  }: {
    category: keyof ConsentCategories;
    checked: boolean;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && setDraft((d) => ({ ...d, [category]: !checked }))}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-border"
      } ${disabled ? "opacity-60" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );

  return (
    <>
      {/* First-visit banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-card border border-border bg-card p-5 shadow-xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            role="dialog"
            aria-label={copy.bannerTitle}
          >
            <div className="text-sm font-semibold">{copy.bannerTitle}</div>
            <p className="mt-1.5 text-sm text-muted">
              {copy.bannerText}{" "}
              <Link href={cookiePolicyHref} className="text-primary hover:underline">
                {copy.cookiePolicy}
              </Link>
              .
            </p>
            {gpc && <p className="mt-2 text-xs text-muted">{copy.gpcNote}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => persist(GRANT_ALL)}
                className="h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {copy.acceptAll}
              </button>
              <button
                type="button"
                onClick={() => persist(DENY_ALL)}
                className="h-10 rounded-full border border-border px-5 text-sm font-semibold hover:bg-soft"
              >
                {copy.rejectAll}
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="h-10 rounded-full px-5 text-sm font-medium text-muted hover:text-foreground"
              >
                {copy.managePreferences}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preferences modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => decided && setModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={copy.modalTitle}
          >
            <motion.div
              className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-card p-6 shadow-2xl sm:rounded-2xl"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold">{copy.modalTitle}</h2>
              {gpc && <p className="mt-1 text-xs text-muted">{copy.gpcNote}</p>}

              <div className="mt-4 space-y-3">
                {(["necessary", "analytics", "functional", "marketing"] as const).map((cat) => (
                  <div
                    key={cat}
                    className="flex items-start justify-between gap-4 rounded-card border border-border p-4"
                  >
                    <div>
                      <div className="text-sm font-semibold">
                        {copy.categories[cat].name}
                        {cat === "necessary" && (
                          <span className="ml-2 text-xs font-normal text-muted">
                            ({copy.alwaysOn})
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted">{copy.categories[cat].desc}</p>
                    </div>
                    <Toggle
                      category={cat}
                      checked={cat === "necessary" ? true : draft[cat]}
                      disabled={cat === "necessary"}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => persist(draft)}
                  className="h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  {copy.save}
                </button>
                <button
                  type="button"
                  onClick={() => persist(GRANT_ALL)}
                  className="h-10 rounded-full border border-border px-5 text-sm font-semibold hover:bg-soft"
                >
                  {copy.acceptAll}
                </button>
                <button
                  type="button"
                  onClick={() => persist(DENY_ALL)}
                  className="h-10 rounded-full border border-border px-5 text-sm font-semibold hover:bg-soft"
                >
                  {copy.rejectAll}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
