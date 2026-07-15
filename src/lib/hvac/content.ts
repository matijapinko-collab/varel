/**
 * Varel HVAC — centralized Croatian content + structured pricing config.
 * Single source of truth: components read prices/features/FAQ from here so the
 * same values are never duplicated across JSX. A future English version can add
 * a parallel content object without touching the components.
 */

export const HVAC_ROUTES = {
  landing: "/hvac",
  demo: "/hvac-demo",
  login: "/hvac-b2b",
} as const;

export type ContractKey = "monthly" | "annual12" | "annual24";

export const contractOrder: ContractKey[] = ["monthly", "annual12", "annual24"];

export const contractLabels: Record<ContractKey, string> = {
  monthly: "Bez ugovorne obveze",
  annual12: "Ugovor na 12 mjeseci",
  annual24: "Ugovor na 24 mjeseca",
};

/** Short labels for the toggle control. */
export const contractToggleLabels: Record<ContractKey, string> = {
  monthly: "Mjesečno",
  annual12: "12 mjeseci",
  annual24: "24 mjeseca",
};

export const hvacPricing = {
  solo: { monthly: 79, annual12: 69, annual24: 50 },
  team: { monthly: 189, annual12: 169, annual24: 149 },
  business: { monthly: 229, annual12: 199, annual24: 179 },
} as const;

export const hvacWebsitePricing = {
  oneTime: 1000,
  installmentTotal: 1500,
  installments: 24,
  monthlyInstallment: 62.5,
} as const;

export type PackageId = keyof typeof hvacPricing;

export type HvacPackage = {
  id: PackageId;
  name: string;
  technicians: string;
  tagline: string;
  bookingType: string;
  features: string[];
  excluded: string[];
  note?: string;
  cta: string;
  highlighted?: boolean;
  badge?: string;
};

export const hvacPackages: HvacPackage[] = [
  {
    id: "solo",
    name: "Varel Solo",
    technicians: "1 majstor",
    tagline: "Za samostalne majstore i servisere.",
    bookingType: "Booking kroz Varel web-aplikaciju",
    features: [
      "1 majstor",
      "Baza klijenata",
      "Lokacije i objekti",
      "Evidencija klima-uređaja",
      "Servisna povijest",
      "Kalendar termina",
      "Digitalni radni nalozi",
      "Fotografije i dokumentacija",
      "Ponude",
      "Osnovno praćenje naplate",
      "Servisni podsjetnici",
      "Osnovni izvještaji",
      "Booking kroz Varel web-aplikaciju",
      "Zasebna Varel booking poveznica",
    ],
    excluded: [
      "WordPress plugin",
      "Booking embed u web-stranicu",
      "Javni booking integracijski API",
      "White-label booking",
      "Zajednički kalendar za tim",
    ],
    note: "Solo booking radi isključivo kroz Varel web-aplikaciju i ne može se integrirati u WordPress ili drugu web-stranicu.",
    cta: "Odaberite Solo",
  },
  {
    id: "team",
    name: "Varel Team",
    technicians: "Do 5 majstora",
    tagline: "Za montažne timove i manje servise.",
    bookingType: "Napredni booking + WordPress i embed",
    features: [
      "Sve iz Solo paketa",
      "Do 5 majstora",
      "Zajednički kalendar",
      "Dodjeljivanje poslova",
      "Različite korisničke uloge",
      "Izvještaji po majstoru",
      "Digitalni potpis klijenta",
      "Automatske potvrde",
      "Automatski podsjetnici",
      "Napredni online booking",
      "WordPress plugin",
      "Booking embed modul",
      "Integracija bookinga u postojeću web-stranicu",
      "Vizualna prilagodba bookinga",
    ],
    excluded: [],
    cta: "Odaberite Team",
    highlighted: true,
    badge: "Najpopularniji",
  },
  {
    id: "business",
    name: "Varel Business",
    technicians: "Do 20 majstora",
    tagline: "Za veće servisne tvrtke i više timova.",
    bookingType: "Sve iz Teama + više timova i lokacija",
    features: [
      "Sve iz Team paketa",
      "Do 20 majstora",
      "Svaki dodatni majstor 15 € mjesečno",
      "Više timova",
      "Voditelji timova",
      "Napredna korisnička prava",
      "Više poslovnih lokacija",
      "Napredno raspoređivanje",
      "Upravljanje zalihama i dijelovima",
      "Napredni izvještaji",
      "Prioritetna podrška",
      "Mogućnost povezane Next.js web-stranice",
    ],
    excluded: [],
    cta: "Odaberite Business",
  },
];

/** Section 4 — eight main benefits. */
export const hvacBenefits: { icon: string; title: string; text: string }[] = [
  { icon: "users", title: "Klijenti i lokacije", text: "Svi podaci o klijentima, adrese, objekti i povijest komunikacije na jednom mjestu." },
  { icon: "airvent", title: "Evidencija klima-uređaja", text: "Svaki uređaj ima svoj profil s modelom, serijskim brojem, fotografijama, dokumentacijom i cijelom servisnom poviješću." },
  { icon: "calendar", title: "Kalendar i majstori", text: "Vidite dostupnost majstora i dodijelite svaki posao pravoj osobi." },
  { icon: "clipboard", title: "Digitalni radni nalozi", text: "Majstori otvaraju naloge na mobitelu, dodaju fotografije, materijale i bilješke te prikupljaju potpis klijenta." },
  { icon: "globe", title: "Online booking", text: "Klijenti mogu zatražiti slobodan termin putem Varela. Mogućnosti bookinga ovise o odabranom paketu." },
  { icon: "bell", title: "Servisni podsjetnici", text: "Varel prati kada je uređaj montiran ili servisiran i pomaže vratiti klijenta na sljedeći servis." },
  { icon: "receipt", title: "Ponude i naplata", text: "Izradite ponude te pratite statuse posla i naplate." },
  { icon: "chart", title: "Izvještaji", text: "Pratite poslove, prihode, učinak majstora i buduće prilike za servis." },
];

/** Section 5 — workflow steps. */
export const hvacWorkflow: { title: string; text: string }[] = [
  { title: "Klijent šalje upit", text: "Klijent šalje upit putem Varel booking stranice ili se izravno javlja tvrtki." },
  { title: "Termin se dodjeljuje majstoru", text: "Administrator odabire datum, vrijeme i majstora." },
  { title: "Majstor dobiva sve podatke", text: "Majstor na mobitelu vidi klijenta, adresu, uređaj, servisnu povijest i opis kvara." },
  { title: "Radni nalog se završava digitalno", text: "Majstor dodaje detalje posla, fotografije, materijale i potpis klijenta." },
  { title: "Varel priprema sljedeći servis", text: "Sustav bilježi datum servisa i priprema budući podsjetnik." },
];

/** Section 2 — audience categories. */
export const hvacAudience: { title: string; text: string }[] = [
  { title: "Samostalni majstori", text: "Vodite cijeli posao sami, bez papira i izgubljenih poziva." },
  { title: "Montažni timovi", text: "Uskladite montaže i podijelite poslove među majstorima." },
  { title: "Klima servisi", text: "Organizirajte termine, uređaje i servisnu povijest na jednom mjestu." },
  { title: "Veće servisne tvrtke", text: "Vodite više timova, lokacija i majstora uz jasne uloge i izvještaje." },
];

/** Section 3 — before/after comparison. */
export const hvacBefore = [
  "Izgubljeni upiti",
  "Dvostruko rezervirani termini",
  "Nepoznata servisna povijest",
  "Fotografije među privatnim datotekama",
  "Zaboravljeni godišnji servisi",
  "Nejasna raspodjela posla",
];

export const hvacAfter = [
  "Svi klijenti na jednom mjestu",
  "Pregled svih uređaja",
  "Zajednički kalendar",
  "Digitalni radni nalozi",
  "Jasni statusi intervencija",
  "Automatizirani servisni podsjetnici",
];

/** Section 7 — booking comparison. */
export const hvacBooking: { plan: string; heading: string; points: string[]; note?: string }[] = [
  {
    plan: "Varel Solo",
    heading: "Booking kroz Varel web-aplikaciju",
    points: [
      "Vlastita Varel booking poveznica",
      "Klijent bira uslugu i opisuje kvar",
      "Klijent unosi kontakt podatke",
      "Može priložiti fotografiju uređaja",
      "Odabir ili zahtjev za slobodan termin",
    ],
    note: "Booking je dostupan isključivo putem Varel web-aplikacije. Ne može se ugraditi u WordPress ili drugu web-stranicu.",
  },
  {
    plan: "Varel Team",
    heading: "Napredni booking + integracija u web",
    points: [
      "Sve iz Solo bookinga",
      "WordPress plugin",
      "Booking embed u postojeću web-stranicu",
      "Vizualna prilagodba web-stranici tvrtke",
      "Zajednička dostupnost tima",
      "Automatske potvrde bookinga",
      "Dodjeljivanje majstora",
    ],
  },
  {
    plan: "Varel Business",
    heading: "Booking za veće timove",
    points: [
      "Sve iz Team bookinga",
      "Podrška za veće timove",
      "Više servisnih područja",
      "Napredna korisnička prava",
      "Napredno raspoređivanje",
      "Mogućnost povezane Next.js web-stranice",
    ],
  },
];

/** Section 8 — demo role tabs. */
export const hvacDemoRoles: { role: string; title: string; text: string }[] = [
  { role: "Vlasnik", title: "Pregled cijelog poslovanja", text: "Isprobat ćete pregled prihoda, poslova, učinka majstora i budućih servisnih prilika." },
  { role: "Administrator", title: "Termini i radni nalozi", text: "Isprobat ćete dodjelu termina, upravljanje klijentima, uređajima i radnim nalozima." },
  { role: "Majstor", title: "Mobilni rad na terenu", text: "Isprobat ćete mobilni prikaz naloga s adresom, uređajem, poviješću i digitalnim potpisom." },
];

/** Section 11 — website add-on included items. */
export const hvacWebsiteFeatures = [
  "Individualna vizualna prilagodba",
  "Responzivna Next.js web-stranica",
  "Stranice usluga",
  "Stranica o nama",
  "Kontakt stranica",
  "Galerija projekata",
  "Recenzije klijenata",
  "Povezani Varel booking",
  "Osnovno upravljanje sadržajem",
  "Tehnički SEO",
  "Strukturirani podaci za lokalno poslovanje",
  "Google Analytics integracija",
  "Google Search Console integracija",
  "SSL, hosting i sigurnosne kopije",
  "Tehničko održavanje",
];

/** Section 13 — FAQ. */
export const hvacFaq: { q: string; a: string }[] = [
  { q: "Što je Varel HVAC?", a: "Varel HVAC je poslovni softver za montažere i servisere klima-uređaja. Povezuje klijente, uređaje, termine, majstore, radne naloge, booking i servisnu povijest u jedan sustav." },
  { q: "Trebam li instalirati program?", a: "Ne. Varel HVAC je zamišljen kao web-aplikacija koja radi u modernom pregledniku i prilagođena je za računalo, tablet i mobitel." },
  { q: "Mogu li koristiti Varel ako radim sam?", a: "Da. Varel Solo je namijenjen jednom samostalnom majstoru." },
  { q: "Ima li Solo paket online booking?", a: "Da. Solo uključuje booking kroz zasebnu stranicu Varel web-aplikacije. Ne može se integrirati u WordPress ili drugu web-stranicu." },
  { q: "Koji paket podržava WordPress booking?", a: "Varel Team i Varel Business podržavaju napredniju integraciju bookinga s postojećom web-stranicom, uključujući planiranu WordPress integraciju." },
  { q: "Koliko majstora podržava Business paket?", a: "Business uključuje do 20 majstora. Svaki dodatni majstor stoji 15 € mjesečno." },
  { q: "Postoji li ugovorna obveza?", a: "Možete odabrati fleksibilno mjesečno plaćanje bez dugoročnog ugovora, ugovor na 12 mjeseci ili povoljniji ugovor na 24 mjeseca." },
  { q: "Mogu li isprobati aplikaciju prije kupnje?", a: "Ruta /hvac-demo pružit će sandbox okruženje s izmišljenim podacima kako biste istražili planirani tijek rada aplikacije." },
  { q: "Je li web-stranica uključena u Business pretplatu?", a: "Ne. Povezana Next.js web-stranica dodatna je usluga dostupna Business korisnicima." },
  { q: "Koliko košta Next.js web-stranica?", a: "Stoji 1.000 € kod jednokratnog plaćanja ili 1.500 € kroz 24 mjesečne rate po 62,50 €." },
  { q: "Jesu li cijene s PDV-om?", a: "Ne. Sve prikazane cijene su bez PDV-a." },
];

/** Section 7 — landing navigation anchors. */
export const hvacNavAnchors: { id: string; label: string }[] = [
  { id: "kako-funkcionira", label: "Kako funkcionira" },
  { id: "funkcionalnosti", label: "Funkcionalnosti" },
  { id: "paketi", label: "Paketi" },
  { id: "demo", label: "Demo" },
  { id: "faq", label: "Česta pitanja" },
];

/** Form select options. */
export const teamSizeOptions = ["samo ja", "2–5", "6–10", "11–20", "više od 20"];
export const currentSystemOptions = [
  "papir i bilježnica",
  "WhatsApp",
  "Google Calendar",
  "Excel",
  "drugi servisni softver",
  "kombinacija više alata",
];
export const interestedPlanOptions = ["Solo", "Team", "Business", "nisam siguran"];

export const VAT_NOTE = "Sve cijene navedene su bez PDV-a.";
