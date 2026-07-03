import { getSetting } from "@/lib/settings";
import { ConsentedAnalytics } from "./consented-analytics";

/**
 * Injects the Search Console verification meta (always) and the consent-gated
 * GA4 / GTM tags. GA/GTM only load after the visitor grants analytics consent
 * (handled by <ConsentedAnalytics>).
 */
export async function GoogleScripts() {
  const [gaId, gtmId, gscCode] = await Promise.all([
    getSetting<string>("google_analytics_id").catch(() => null),
    getSetting<string>("google_tag_manager_id").catch(() => null),
    getSetting<string>("search_console_verification").catch(() => null),
  ]);

  return (
    <>
      {gscCode && <meta name="google-site-verification" content={gscCode} />}
      <ConsentedAnalytics gaId={gaId} gtmId={gtmId} />
    </>
  );
}
