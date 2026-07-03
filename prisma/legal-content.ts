/**
 * Seed content for the Privacy Policy and Cookie Policy legal pages.
 * Only English and Croatian are authored here; every other locale falls back
 * to the English version at request time (see src/lib/legal.ts + the CMS page
 * route). After seeding, the pages are fully editable in Admin → Pages.
 *
 * NOTE: This is a thorough template drafted from the project brief. Have it
 * reviewed by qualified legal counsel before relying on it in production.
 */

export const LEGAL_ENTITY = {
  name: "Pinko obrt",
  address: "Zamlačka 28A, 10410 Velika Mlaka, Croatia",
  vat: "HR12438213362",
  website: "Varel.io",
  contact: "matija@pinko.hr",
  lastUpdated: "July 3, 2026",
  lastUpdatedHr: "3. srpnja 2026.",
};

const EN_PRIVACY = `
<h2>Privacy Policy</h2>
<p><em>Last updated: ${LEGAL_ENTITY.lastUpdated}</em></p>
<p>This Privacy Policy explains how <strong>${LEGAL_ENTITY.name}</strong> (“we”, “us”, “our”), operator of the website ${LEGAL_ENTITY.website} (“Varel”, the “Service”), collects, uses, stores, shares and protects personal information. We are the data controller for the personal data described here.</p>
<p><strong>Contact:</strong> ${LEGAL_ENTITY.address} · VAT ID ${LEGAL_ENTITY.vat} · Email <a href="mailto:${LEGAL_ENTITY.contact}">${LEGAL_ENTITY.contact}</a>. For any privacy or data-protection question, contact us at <a href="mailto:${LEGAL_ENTITY.contact}">${LEGAL_ENTITY.contact}</a>.</p>

<h3>1. Information we collect</h3>
<ul>
<li><strong>Information you provide:</strong> your email address when you subscribe to our newsletter; any details you send us by email or through contact forms.</li>
<li><strong>Usage and analytics data:</strong> pages viewed, searches performed, tools and comparisons opened, prompts copied, language selected, approximate country, device type and browser. We collect this through Google Analytics, Google Tag Manager and our own internal analytics events.</li>
<li><strong>Affiliate click data:</strong> when you click an outbound affiliate link, we record the click (including a non-reversible hashed identifier, approximate country, device and referring page). We do not store your raw IP address.</li>
<li><strong>Technical data:</strong> data automatically processed by our hosting and security systems, such as request metadata, for the purposes of delivering and protecting the Service.</li>
<li><strong>Administrator uploads:</strong> if you are an authorised administrator, images and files you upload are processed and stored via our media storage provider.</li>
</ul>

<h3>2. How and why we use your information (legal bases)</h3>
<p>Under the EU General Data Protection Regulation (GDPR) and, where applicable, the UK GDPR, we rely on the following legal bases:</p>
<ul>
<li><strong>Consent</strong> — for non-essential cookies, analytics and marketing/advertising technologies, and for sending you our newsletter.</li>
<li><strong>Legitimate interests</strong> — for operating, securing and improving the Service, understanding aggregate usage, and measuring affiliate performance, balanced against your rights.</li>
<li><strong>Legal obligation</strong> — where we must retain or disclose data to comply with law.</li>
</ul>

<h3>3. Cookies and consent</h3>
<p>We use cookies and similar technologies as described in our <a href="/en/cookie-policy">Cookie Policy</a>. Where required (for example for visitors in the EU, EEA and UK), analytics and marketing technologies, including Google Analytics and Google Tag Manager, load only after you have given consent through our cookie banner. You can change or withdraw your consent at any time via “Cookie Settings” in the footer. We aim to respect browser-level signals such as Global Privacy Control (GPC) where feasible.</p>

<h3>4. Newsletter</h3>
<p>If you subscribe, we use your email address to send you the Varel newsletter. You can unsubscribe at any time using the link in each email or by contacting us. We store your subscription status and the source and date of signup.</p>

<h3>5. Analytics and affiliate tracking</h3>
<p>We use Google Analytics and Google Tag Manager to understand how the Service is used, and internal analytics events stored in our database. We also track outbound affiliate link clicks so we can measure the performance of recommendations. Affiliate clicks and analytics events are stored with privacy-preserving identifiers and do not include your raw IP address. Some affiliate partners may set their own cookies once you leave our site; those are governed by the partners’ own privacy policies.</p>

<h3>6. Sharing and processors</h3>
<p>We do not sell your personal information. We share data only with service providers who process it on our behalf, including:</p>
<ul>
<li><strong>Vercel</strong> — website hosting and, via Vercel Blob, media storage.</li>
<li><strong>Our database provider</strong> — managed PostgreSQL hosting for the Service’s content and events.</li>
<li><strong>Google</strong> — Google Analytics and Google Tag Manager (subject to your consent).</li>
</ul>
<p>These providers act as processors under written agreements and may process data in accordance with appropriate safeguards.</p>

<h3>7. International transfers</h3>
<p>Some of our providers may process data outside your country, including in the United States. Where personal data is transferred outside the EEA or UK, we rely on appropriate safeguards such as the European Commission’s Standard Contractual Clauses or equivalent mechanisms.</p>

<h3>8. Data retention</h3>
<p>We keep personal data only as long as necessary for the purposes described here: newsletter data until you unsubscribe; analytics and affiliate-click data for a limited period consistent with measuring performance; and administrative/audit records as needed for security and legal compliance. We then delete or anonymise the data.</p>

<h3>9. Your rights</h3>
<p>Subject to applicable law, you have the right to access, rectify, erase, restrict or object to processing of your personal data, to data portability, and to withdraw consent at any time. To exercise any right, email <a href="mailto:${LEGAL_ENTITY.contact}">${LEGAL_ENTITY.contact}</a>. You also have the right to lodge a complaint with a supervisory authority — in Croatia, the Personal Data Protection Agency (AZOP).</p>

<h3>10. US privacy rights (CCPA/CPRA and similar state laws)</h3>
<p>If you are a resident of California or another US state with comparable privacy laws (such as Virginia, Colorado, Connecticut or Utah), you may have rights to know, access, delete and correct personal information, and to opt out of the “sale” or “sharing” of personal information and of targeted advertising. We do not sell personal information for money. To exercise these rights, use “Privacy Choices” in the footer or email <a href="mailto:${LEGAL_ENTITY.contact}">${LEGAL_ENTITY.contact}</a>. We will not discriminate against you for exercising your rights.</p>

<h3>11. Children’s privacy</h3>
<p>The Service is intended for adults and is not directed at children under 16. We do not knowingly collect personal data from children. If you believe a child has provided us data, contact us and we will delete it.</p>

<h3>12. Third-party links</h3>
<p>Varel links to third-party tools, comparisons, deals and affiliate destinations. We are not responsible for the privacy practices or content of those third-party sites. Please review their policies before providing them with personal data.</p>

<h3>13. Security</h3>
<p>We use appropriate technical and organisational measures to protect personal data, including access controls, hashed credentials, audit logging and encrypted secrets. No method of transmission or storage is completely secure, but we work to protect your information.</p>

<h3>14. Changes to this policy</h3>
<p>We may update this Privacy Policy from time to time. We will change the “Last updated” date above and, where appropriate, notify you. Continued use of the Service after changes means you accept the updated policy.</p>

<h3>15. Contact</h3>
<p>${LEGAL_ENTITY.name}, ${LEGAL_ENTITY.address}. Privacy and data-protection contact: <a href="mailto:${LEGAL_ENTITY.contact}">${LEGAL_ENTITY.contact}</a>.</p>
`;

const EN_COOKIE = `
<h2>Cookie Policy</h2>
<p><em>Last updated: ${LEGAL_ENTITY.lastUpdated}</em></p>
<p>This Cookie Policy explains how <strong>${LEGAL_ENTITY.name}</strong>, operator of ${LEGAL_ENTITY.website} (“Varel”), uses cookies and similar technologies. It should be read together with our <a href="/en/privacy-policy">Privacy Policy</a>.</p>

<h3>1. What are cookies?</h3>
<p>Cookies are small text files stored on your device when you visit a website. Similar technologies include local storage, pixels and tags. They help websites function, remember preferences, and measure usage.</p>

<h3>2. Categories of cookies we use</h3>
<ul>
<li><strong>Strictly necessary</strong> — required for the site to work (for example remembering your language and cookie choices, and keeping administrators signed in). These are always active and cannot be switched off.</li>
<li><strong>Analytics</strong> — help us understand how the site is used (Google Analytics, Google Tag Manager, and our internal analytics events). Optional.</li>
<li><strong>Functional</strong> — remember choices you make to improve your experience. Optional.</li>
<li><strong>Marketing / advertising</strong> — used to measure and improve recommendations, including affiliate click tracking, and any future advertising pixels. Optional.</li>
</ul>

<h3>3. Consent management</h3>
<p>When you first visit Varel you can <strong>Accept all</strong>, <strong>Reject all</strong>, or <strong>Manage preferences</strong> by category. Strictly necessary cookies are always on. Analytics, functional and marketing technologies load only if you allow them. You can change your choices at any time using the <strong>“Cookie Settings”</strong> link in the footer. For visitors in the EU, EEA and UK, non-essential technologies (including Google Analytics and Google Tag Manager) do not load before you consent.</p>

<h3>4. Google Analytics and Google Tag Manager</h3>
<p>We use Google Analytics and Google Tag Manager to measure traffic and usage. These run only after you consent to analytics cookies. Google may set its own cookies; see Google’s privacy resources for details, and use our consent controls to allow or block them.</p>

<h3>5. Affiliate click tracking</h3>
<p>When you click an affiliate link, we record the click to measure performance. We use privacy-preserving identifiers and do not store your raw IP address. Affiliate partners may set their own cookies on their sites once you leave Varel; those are governed by the partners’ policies.</p>

<h3>6. Managing cookies in your browser</h3>
<p>Most browsers let you view, delete and block cookies through their settings. Blocking strictly necessary cookies may break parts of the site. See your browser’s help pages for instructions.</p>

<h3>7. Global Privacy Control and Do Not Track</h3>
<p>We aim to recognise browser-level privacy signals such as Global Privacy Control (GPC) and to treat them, where feasible, as a request to limit non-essential tracking. Support for such signals continues to evolve and we will update our handling accordingly.</p>

<h3>8. Changes</h3>
<p>We may update this Cookie Policy from time to time. The “Last updated” date above reflects the latest version.</p>

<h3>9. Contact</h3>
<p>Questions about cookies? Contact ${LEGAL_ENTITY.name} at <a href="mailto:${LEGAL_ENTITY.contact}">${LEGAL_ENTITY.contact}</a>.</p>
`;

const HR_PRIVACY = `
<h2>Politika privatnosti</h2>
<p><em>Zadnje ažurirano: ${LEGAL_ENTITY.lastUpdatedHr}</em></p>
<p>Ova Politika privatnosti objašnjava kako <strong>${LEGAL_ENTITY.name}</strong> (“mi”, “nas”, “naše”), operator internetske stranice ${LEGAL_ENTITY.website} (“Varel”, “Usluga”), prikuplja, koristi, pohranjuje, dijeli i štiti osobne podatke. Mi smo voditelj obrade osobnih podataka opisanih u nastavku.</p>
<p><strong>Kontakt:</strong> ${LEGAL_ENTITY.address} · OIB/PDV ID ${LEGAL_ENTITY.vat} · E-mail <a href="mailto:${LEGAL_ENTITY.contact}">${LEGAL_ENTITY.contact}</a>. Za sva pitanja o privatnosti i zaštiti podataka obratite nam se na <a href="mailto:${LEGAL_ENTITY.contact}">${LEGAL_ENTITY.contact}</a>.</p>

<h3>1. Koje podatke prikupljamo</h3>
<ul>
<li><strong>Podaci koje nam dajete:</strong> vaša e-mail adresa kada se pretplatite na newsletter; podaci koje nam pošaljete e-mailom ili putem kontakt obrazaca.</li>
<li><strong>Podaci o korištenju i analitika:</strong> pregledane stranice, pretrage, otvoreni alati i usporedbe, kopirani promptovi, odabrani jezik, približna država, vrsta uređaja i preglednik. Ove podatke prikupljamo putem Google Analyticsa, Google Tag Managera i vlastite interne analitike.</li>
<li><strong>Podaci o affiliate klikovima:</strong> kada kliknete na vanjsku affiliate poveznicu, bilježimo klik (uključujući nepovratni hashirani identifikator, približnu državu, uređaj i stranicu s koje ste došli). Ne pohranjujemo vašu izvornu IP adresu.</li>
<li><strong>Tehnički podaci:</strong> podaci koje automatski obrađuju naši sustavi za hosting i sigurnost radi pružanja i zaštite Usluge.</li>
<li><strong>Učitavanja administratora:</strong> ako ste ovlašteni administrator, slike i datoteke koje učitate obrađuju se i pohranjuju putem našeg pružatelja pohrane medija.</li>
</ul>

<h3>2. Kako i zašto koristimo vaše podatke (pravne osnove)</h3>
<p>Sukladno Općoj uredbi o zaštiti podataka (GDPR) i, gdje je primjenjivo, UK GDPR-u, oslanjamo se na sljedeće pravne osnove:</p>
<ul>
<li><strong>Privola</strong> — za neobavezne kolačiće, analitiku i marketinške/oglašivačke tehnologije te za slanje newslettera.</li>
<li><strong>Legitimni interes</strong> — za rad, sigurnost i poboljšanje Usluge, razumijevanje zbirnog korištenja i mjerenje uspješnosti affiliate poveznica, uz ravnotežu s vašim pravima.</li>
<li><strong>Zakonska obveza</strong> — kada moramo zadržati ili otkriti podatke radi usklađenosti sa zakonom.</li>
</ul>

<h3>3. Kolačići i privola</h3>
<p>Koristimo kolačiće i slične tehnologije kako je opisano u našoj <a href="/hr/politika-kolacica">Politici kolačića</a>. Gdje je to potrebno (primjerice za posjetitelje iz EU-a, EGP-a i UK-a), analitičke i marketinške tehnologije, uključujući Google Analytics i Google Tag Manager, učitavaju se tek nakon što date privolu putem našeg banera za kolačiće. Privolu možete promijeniti ili povući u bilo kojem trenutku putem “Postavke kolačića” u podnožju. Nastojimo poštivati signale na razini preglednika poput Global Privacy Control (GPC) gdje je to izvedivo.</p>

<h3>4. Newsletter</h3>
<p>Ako se pretplatite, vašu e-mail adresu koristimo za slanje Varel newslettera. Možete se odjaviti u bilo kojem trenutku putem poveznice u svakom e-mailu ili kontaktiranjem nas. Pohranjujemo status pretplate te izvor i datum prijave.</p>

<h3>5. Analitika i praćenje affiliate klikova</h3>
<p>Koristimo Google Analytics i Google Tag Manager za razumijevanje korištenja Usluge te interne analitičke događaje pohranjene u našoj bazi. Također pratimo klikove na vanjske affiliate poveznice radi mjerenja uspješnosti preporuka. Affiliate klikovi i analitički događaji pohranjuju se s identifikatorima koji čuvaju privatnost i ne uključuju vašu izvornu IP adresu. Neki affiliate partneri mogu postaviti vlastite kolačiće nakon što napustite našu stranicu; oni podliježu politikama tih partnera.</p>

<h3>6. Dijeljenje i izvršitelji obrade</h3>
<p>Ne prodajemo vaše osobne podatke. Podatke dijelimo samo s pružateljima usluga koji ih obrađuju u naše ime, uključujući:</p>
<ul>
<li><strong>Vercel</strong> — hosting stranice i, putem Vercel Bloba, pohrana medija.</li>
<li><strong>Naš pružatelj baze podataka</strong> — upravljani PostgreSQL hosting za sadržaj i događaje Usluge.</li>
<li><strong>Google</strong> — Google Analytics i Google Tag Manager (uz vašu privolu).</li>
</ul>
<p>Ovi pružatelji djeluju kao izvršitelji obrade na temelju pisanih ugovora i mogu obrađivati podatke uz odgovarajuće zaštitne mjere.</p>

<h3>7. Međunarodni prijenosi</h3>
<p>Neki naši pružatelji mogu obrađivati podatke izvan vaše zemlje, uključujući u Sjedinjenim Državama. Kada se osobni podaci prenose izvan EGP-a ili UK-a, oslanjamo se na odgovarajuće zaštitne mjere poput Standardnih ugovornih klauzula Europske komisije ili istovrijednih mehanizama.</p>

<h3>8. Razdoblje čuvanja</h3>
<p>Osobne podatke čuvamo samo onoliko koliko je potrebno za ovdje opisane svrhe: podatke o newsletteru dok se ne odjavite; analitičke i affiliate podatke ograničeno razdoblje potrebno za mjerenje uspješnosti; te administrativne/revizijske zapise koliko je potrebno radi sigurnosti i zakonske usklađenosti. Nakon toga podatke brišemo ili anonimiziramo.</p>

<h3>9. Vaša prava</h3>
<p>Sukladno primjenjivom pravu imate pravo na pristup, ispravak, brisanje, ograničenje ili prigovor na obradu vaših osobnih podataka, na prenosivost podataka te na povlačenje privole u svakom trenutku. Za ostvarivanje bilo kojeg prava pišite na <a href="mailto:${LEGAL_ENTITY.contact}">${LEGAL_ENTITY.contact}</a>. Također imate pravo podnijeti pritužbu nadzornom tijelu — u Hrvatskoj je to Agencija za zaštitu osobnih podataka (AZOP).</p>

<h3>10. Prava na privatnost u SAD-u (CCPA/CPRA i slični zakoni)</h3>
<p>Ako ste stanovnik Kalifornije ili druge američke savezne države sa sličnim zakonima o privatnosti, možete imati prava na uvid, pristup, brisanje i ispravak osobnih podataka te pravo na odbijanje “prodaje” ili “dijeljenja” osobnih podataka i ciljanog oglašavanja. Ne prodajemo osobne podatke za novac. Za ostvarivanje ovih prava koristite “Postavke privatnosti” u podnožju ili pišite na <a href="mailto:${LEGAL_ENTITY.contact}">${LEGAL_ENTITY.contact}</a>.</p>

<h3>11. Privatnost djece</h3>
<p>Usluga je namijenjena odraslima i nije usmjerena na djecu mlađu od 16 godina. Ne prikupljamo svjesno osobne podatke djece. Ako smatrate da nam je dijete dostavilo podatke, kontaktirajte nas i obrisat ćemo ih.</p>

<h3>12. Poveznice trećih strana</h3>
<p>Varel povezuje na alate, usporedbe, ponude i affiliate odredišta trećih strana. Nismo odgovorni za prakse privatnosti ni sadržaj tih stranica. Prije davanja osobnih podataka pregledajte njihove politike.</p>

<h3>13. Sigurnost</h3>
<p>Primjenjujemo odgovarajuće tehničke i organizacijske mjere zaštite osobnih podataka, uključujući kontrole pristupa, hashirane vjerodajnice, revizijske zapise i enkriptirane tajne. Nijedna metoda prijenosa ili pohrane nije potpuno sigurna, no trudimo se zaštititi vaše podatke.</p>

<h3>14. Izmjene ove politike</h3>
<p>Ovu Politiku privatnosti možemo povremeno ažurirati. Promijenit ćemo datum “Zadnje ažurirano” iznad te vas, gdje je primjereno, obavijestiti. Nastavak korištenja Usluge nakon izmjena znači prihvaćanje ažurirane politike.</p>

<h3>15. Kontakt</h3>
<p>${LEGAL_ENTITY.name}, ${LEGAL_ENTITY.address}. Kontakt za privatnost i zaštitu podataka: <a href="mailto:${LEGAL_ENTITY.contact}">${LEGAL_ENTITY.contact}</a>.</p>
`;

const HR_COOKIE = `
<h2>Politika kolačića</h2>
<p><em>Zadnje ažurirano: ${LEGAL_ENTITY.lastUpdatedHr}</em></p>
<p>Ova Politika kolačića objašnjava kako <strong>${LEGAL_ENTITY.name}</strong>, operator stranice ${LEGAL_ENTITY.website} (“Varel”), koristi kolačiće i slične tehnologije. Treba je čitati zajedno s našom <a href="/hr/politika-privatnosti">Politikom privatnosti</a>.</p>

<h3>1. Što su kolačići?</h3>
<p>Kolačići su male tekstualne datoteke pohranjene na vašem uređaju pri posjetu web-stranici. Slične tehnologije uključuju lokalnu pohranu, piksele i oznake. Pomažu stranicama da rade, pamte postavke i mjere korištenje.</p>

<h3>2. Kategorije kolačića koje koristimo</h3>
<ul>
<li><strong>Nužni</strong> — potrebni za rad stranice (npr. pamćenje jezika i vaših izbora o kolačićima te održavanje prijave administratora). Uvijek su aktivni i ne mogu se isključiti.</li>
<li><strong>Analitički</strong> — pomažu nam razumjeti kako se stranica koristi (Google Analytics, Google Tag Manager i interni analitički događaji). Neobavezni.</li>
<li><strong>Funkcionalni</strong> — pamte vaše izbore radi boljeg iskustva. Neobavezni.</li>
<li><strong>Marketinški / oglašivački</strong> — služe za mjerenje i poboljšanje preporuka, uključujući praćenje affiliate klikova i buduće oglašivačke piksele. Neobavezni.</li>
</ul>

<h3>3. Upravljanje privolom</h3>
<p>Pri prvom posjetu Varelu možete odabrati <strong>Prihvati sve</strong>, <strong>Odbij sve</strong> ili <strong>Upravljanje postavkama</strong> po kategoriji. Nužni kolačići uvijek su uključeni. Analitičke, funkcionalne i marketinške tehnologije učitavaju se samo ako ih dopustite. Svoje izbore možete promijeniti u bilo kojem trenutku putem poveznice <strong>“Postavke kolačića”</strong> u podnožju. Za posjetitelje iz EU-a, EGP-a i UK-a neobavezne tehnologije (uključujući Google Analytics i Google Tag Manager) ne učitavaju se prije vaše privole.</p>

<h3>4. Google Analytics i Google Tag Manager</h3>
<p>Koristimo Google Analytics i Google Tag Manager za mjerenje prometa i korištenja. Pokreću se tek nakon što pristanete na analitičke kolačiće. Google može postaviti vlastite kolačiće; koristite naše kontrole privole da ih dopustite ili blokirate.</p>

<h3>5. Praćenje affiliate klikova</h3>
<p>Kada kliknete affiliate poveznicu, bilježimo klik radi mjerenja uspješnosti. Koristimo identifikatore koji čuvaju privatnost i ne pohranjujemo vašu izvornu IP adresu. Affiliate partneri mogu postaviti vlastite kolačiće na svojim stranicama nakon što napustite Varel; oni podliježu politikama tih partnera.</p>

<h3>6. Upravljanje kolačićima u pregledniku</h3>
<p>Većina preglednika omogućuje pregled, brisanje i blokiranje kolačića putem postavki. Blokiranje nužnih kolačića može onemogućiti dijelove stranice. Upute potražite na stranicama pomoći vašeg preglednika.</p>

<h3>7. Global Privacy Control i Do Not Track</h3>
<p>Nastojimo prepoznati signale privatnosti na razini preglednika poput Global Privacy Control (GPC) i tretirati ih, gdje je izvedivo, kao zahtjev za ograničavanje neobaveznog praćenja. Podrška za takve signale se razvija te ćemo u skladu s tim ažurirati postupanje.</p>

<h3>8. Izmjene</h3>
<p>Ovu Politiku kolačića možemo povremeno ažurirati. Datum “Zadnje ažurirano” iznad odražava najnoviju verziju.</p>

<h3>9. Kontakt</h3>
<p>Pitanja o kolačićima? Kontaktirajte ${LEGAL_ENTITY.name} na <a href="mailto:${LEGAL_ENTITY.contact}">${LEGAL_ENTITY.contact}</a>.</p>
`;

export const LEGAL_SEED = {
  privacy: {
    en: {
      slug: "privacy-policy",
      title: "Privacy Policy",
      body: EN_PRIVACY,
      seoTitle: "Privacy Policy | Varel",
      seoDescription:
        "Read Varel’s Privacy Policy to understand how we collect, use, store and protect personal information.",
    },
    hr: {
      slug: "politika-privatnosti",
      title: "Politika privatnosti",
      body: HR_PRIVACY,
      seoTitle: "Politika privatnosti | Varel",
      seoDescription:
        "Pročitajte Varel Politiku privatnosti i saznajte kako prikupljamo, koristimo, pohranjujemo i štitimo osobne podatke.",
    },
  },
  cookie: {
    en: {
      slug: "cookie-policy",
      title: "Cookie Policy",
      body: EN_COOKIE,
      seoTitle: "Cookie Policy | Varel",
      seoDescription:
        "Read Varel’s Cookie Policy to understand how we use cookies, analytics, affiliate tracking and similar technologies.",
    },
    hr: {
      slug: "politika-kolacica",
      title: "Politika kolačića",
      body: HR_COOKIE,
      seoTitle: "Politika kolačića | Varel",
      seoDescription:
        "Pročitajte Varel Politiku kolačića i saznajte kako koristimo kolačiće, analitiku, affiliate tracking i slične tehnologije.",
    },
  },
} as const;
