"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { CONSENT_CHANGE_EVENT, readConsent } from "@/lib/consent";

/**
 * Loads Google Analytics / Google Tag Manager ONLY after the visitor has
 * granted analytics consent. Reacts live to consent changes (no reload needed).
 * IDs are public (they appear in the page), so passing them to the client is
 * fine; no secrets are exposed.
 */
export function ConsentedAnalytics({
  gaId,
  gtmId,
}: {
  gaId?: string | null;
  gtmId?: string | null;
}) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(readConsent()?.categories.analytics === true);
    sync();
    window.addEventListener(CONSENT_CHANGE_EVENT, sync);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, sync);
  }, []);

  if (!allowed) return null;

  return (
    <>
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');`}
          </Script>
        </>
      )}
      {gtmId && (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
        </Script>
      )}
    </>
  );
}
