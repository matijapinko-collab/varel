/** Cookie-consent UI copy. English + Croatian; other locales use English. */
export type ConsentCopy = {
  bannerTitle: string;
  bannerText: string;
  acceptAll: string;
  rejectAll: string;
  managePreferences: string;
  save: string;
  close: string;
  modalTitle: string;
  gpcNote: string;
  cookiePolicy: string;
  categories: {
    necessary: { name: string; desc: string };
    analytics: { name: string; desc: string };
    functional: { name: string; desc: string };
    marketing: { name: string; desc: string };
  };
  alwaysOn: string;
};

const en: ConsentCopy = {
  bannerTitle: "Your privacy",
  bannerText:
    "We use cookies to run the site, measure usage and improve recommendations. You can accept all, reject non-essential, or manage your preferences.",
  acceptAll: "Accept All",
  rejectAll: "Reject All",
  managePreferences: "Manage Preferences",
  save: "Save preferences",
  close: "Close",
  modalTitle: "Cookie preferences",
  gpcNote: "We detected a Global Privacy Control signal — optional cookies are off by default.",
  cookiePolicy: "Cookie Policy",
  alwaysOn: "Always on",
  categories: {
    necessary: {
      name: "Strictly Necessary",
      desc: "Required for the site to work — language, your cookie choices and admin sign-in. Always active.",
    },
    analytics: {
      name: "Analytics",
      desc: "Help us understand how the site is used (Google Analytics, Google Tag Manager and internal analytics).",
    },
    functional: {
      name: "Functional",
      desc: "Remember choices you make to improve your experience.",
    },
    marketing: {
      name: "Marketing / Advertising",
      desc: "Measure and improve recommendations, including affiliate click tracking and any future advertising.",
    },
  },
};

const hr: ConsentCopy = {
  bannerTitle: "Vaša privatnost",
  bannerText:
    "Koristimo kolačiće za rad stranice, mjerenje korištenja i poboljšanje preporuka. Možete prihvatiti sve, odbiti neobavezne ili upravljati postavkama.",
  acceptAll: "Prihvati sve",
  rejectAll: "Odbij sve",
  managePreferences: "Upravljanje postavkama",
  save: "Spremi postavke",
  close: "Zatvori",
  modalTitle: "Postavke kolačića",
  gpcNote: "Otkrili smo Global Privacy Control signal — neobavezni kolačići isključeni su prema zadanome.",
  cookiePolicy: "Politika kolačića",
  alwaysOn: "Uvijek uključeno",
  categories: {
    necessary: {
      name: "Nužni",
      desc: "Potrebni za rad stranice — jezik, vaši izbori o kolačićima i prijava administratora. Uvijek aktivni.",
    },
    analytics: {
      name: "Analitički",
      desc: "Pomažu nam razumjeti kako se stranica koristi (Google Analytics, Google Tag Manager i interna analitika).",
    },
    functional: {
      name: "Funkcionalni",
      desc: "Pamte vaše izbore radi boljeg iskustva.",
    },
    marketing: {
      name: "Marketinški / oglašivački",
      desc: "Mjere i poboljšavaju preporuke, uključujući praćenje affiliate klikova i buduće oglašavanje.",
    },
  },
};

export function getConsentCopy(locale: string): ConsentCopy {
  return locale === "hr" ? hr : en;
}
