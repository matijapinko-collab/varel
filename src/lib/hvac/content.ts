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

/**
 * Monthly pricing, no long-term contract (packages are cancellable monthly).
 * Prices are EUR/month excluding VAT.
 */
export const hvacPricing = {
  start: { monthly: 59 },
  team: { monthly: 139 },
  business: { monthly: 249 },
} as const;

/** Every additional user above the package limit. */
export const EXTRA_USER_EUR = 12;

export const NO_CONTRACT_LABEL = "Bez ugovorne obveze — plaćanje mjesečno";

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
  users: string;
  storage: string;
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
    id: "start",
    name: "Varel Start",
    users: "1 korisnik",
    storage: "5 GB pohrane",
    tagline: "Za samostalne majstore i servisere.",
    bookingType: "Osnovni booking kroz Varel web-aplikaciju",
    features: [
      "1 korisnik",
      "Responzivna web-aplikacija",
      "Baza klijenata",
      "Lokacije i objekti",
      "Evidencija klima-uređaja",
      "Kalendar termina",
      "Radni nalozi",
      "Fotografije",
      "Digitalni potpis klijenta",
      "PDF izvještaji",
      "Osnovne e-mail obavijesti",
      "Osnovni Varel booking",
      "5 GB pohrane",
      "Standardna podrška",
      "WhatsApp parser (uskoro)",
    ],
    excluded: [
      "Ponude",
      "Ugovori o održavanju",
      "Integracija bookinga u web-stranicu",
      "Više korisničkih uloga",
      "Više poslovnica",
    ],
    note: "Start booking radi kroz Varel web-aplikaciju. Integracija u vlastitu web-stranicu dostupna je od Team paketa.",
    cta: "Odaberite Start",
  },
  {
    id: "team",
    name: "Varel Team",
    users: "Do 5 korisnika",
    storage: "25 GB pohrane",
    tagline: "Za servisne timove koji rade zajedno.",
    bookingType: "Napredni booking + integracija u web-stranicu",
    features: [
      "Sve iz Start paketa",
      "Do 5 korisnika",
      "Napredni online booking",
      "Dodatne korisničke uloge",
      "Ponude",
      "Odobravanje dodatnih radova",
      "Ugovori o održavanju",
      "Napredni servisni podsjetnici",
      "Integracija bookinga u web-stranicu",
      "25 GB pohrane",
      "Android aplikacija (uskoro)",
      "Share to Varel (uskoro)",
    ],
    excluded: [],
    cta: "Odaberite Team",
    highlighted: true,
    badge: "Najpopularniji",
  },
  {
    id: "business",
    name: "Varel Business",
    users: "Do 15 korisnika",
    storage: "100 GB pohrane",
    tagline: "Za veće servisne tvrtke i više poslovnica.",
    bookingType: "Sve iz Teama + više poslovnica",
    features: [
      "Sve iz Team paketa",
      "Do 15 korisnika",
      "Više poslovnica",
      "Napredna korisnička prava",
      "Napredni izvještaji",
      "Prošireni revizijski zapis",
      "100 GB pohrane",
      "Prioritetna podrška",
      "Android aplikacija čim bude dostupna",
      "WhatsApp Business integracija (uskoro)",
      "Prilagođeno PDF brendiranje",
      "Napredna automatizacija",
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
    plan: "Varel Start",
    heading: "Osnovni booking kroz Varel",
    points: [
      "Vlastita Varel booking poveznica",
      "Klijent bira uslugu i opisuje kvar",
      "Klijent unosi kontakt podatke",
      "Može priložiti fotografiju uređaja",
      "Zahtjev za željeni termin",
    ],
    note: "Booking je dostupan putem Varel web-aplikacije. Ugradnja u vlastitu web-stranicu dostupna je od Team paketa.",
  },
  {
    plan: "Varel Team",
    heading: "Napredni booking + integracija u web",
    points: [
      "Sve iz Start bookinga",
      "Ugradnja bookinga u postojeću web-stranicu",
      "Booking gumb i vizualna prilagodba",
      "Odabir usluga i radnog vremena",
      "Zajednička dostupnost tima",
      "Automatske potvrde bookinga",
      "Dodjeljivanje majstora",
    ],
  },
  {
    plan: "Varel Business",
    heading: "Booking za više poslovnica",
    points: [
      "Sve iz Team bookinga",
      "Više poslovnica i servisnih područja",
      "Napredna korisnička prava",
      "Napredno raspoređivanje",
      "Blokirani datumi po poslovnici",
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
  { q: "Što je Varel HVAC?", a: "Varel HVAC je poslovni softver za montažere i servisere klima-uređaja. Povezuje klijente, lokacije, uređaje, termine, majstore, radne naloge, booking i servisnu povijest u jedan sustav." },
  { q: "Trebam li instalirati program?", a: "Ne. Varel HVAC je web-aplikacija koja radi u modernom pregledniku i prilagođena je za računalo, tablet i mobitel." },
  { q: "Mogu li koristiti Varel ako radim sam?", a: "Da. Varel Start namijenjen je jednom korisniku i stoji 59 € mjesečno." },
  { q: "Postoji li ugovorna obveza?", a: "Ne. Svi paketi plaćaju se mjesečno, bez dugoročnog ugovora, i možete ih otkazati u skladu s uvjetima korištenja." },
  { q: "Ima li Start paket online booking?", a: "Da. Start uključuje osnovni booking kroz Varel web-aplikaciju. Ugradnja bookinga u vlastitu web-stranicu dostupna je od Team paketa." },
  { q: "Koji paket podržava integraciju bookinga u web-stranicu?", a: "Varel Team i Varel Business podržavaju ugradnju bookinga u postojeću web-stranicu." },
  { q: "Koliko korisnika podržavaju paketi?", a: "Start uključuje 1 korisnika, Team do 5, a Business do 15 korisnika. Svaki dodatni korisnik stoji 12 € mjesečno." },
  { q: "Koliko pohrane dobivam?", a: "Start uključuje 5 GB, Team 25 GB, a Business 100 GB pohrane za fotografije i dokumente." },
  { q: "Mogu li isprobati aplikaciju prije kupnje?", a: "Ruta /hvac-demo pružit će sandbox okruženje s izmišljenim podacima kako biste istražili tijek rada aplikacije." },
  { q: "Je li web-stranica uključena u pretplatu?", a: "Ne. Povezana Next.js web-stranica dodatna je usluga i naplaćuje se zasebno." },
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
