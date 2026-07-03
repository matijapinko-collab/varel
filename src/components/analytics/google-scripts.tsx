import Script from "next/script";
import { getSetting } from "@/lib/settings";

/** Injects GA4 / GTM tags when configured in Admin → Analytics. */
export async function GoogleScripts() {
  const [gaId, gtmId, gscCode] = await Promise.all([
    getSetting<string>("google_analytics_id").catch(() => null),
    getSetting<string>("google_tag_manager_id").catch(() => null),
    getSetting<string>("search_console_verification").catch(() => null),
  ]);

  return (
    <>
      {gscCode && <meta name="google-site-verification" content={gscCode} />}
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
