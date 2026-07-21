# Varel Academy — gap analysis

Faza 0 iz briefa: revizija postojećeg koda prije pisanja ijedne linije Akademije.
Cilj dokumenta je odgovoriti na tri pitanja — što već imamo, gdje brief pretpostavlja
nešto što ne postoji, i koji je najjeftiniji put do prve javne verzije.

Datum revizije: 2026-07-21. Repo: `varel`, grana `main`, commit `5651cd9`.

---

## 1. Sažetak nalaza

**Dobra vijest:** oko 60 % onoga što brief traži već postoji pod drugim imenom.
Ključne stvari — kategorije s prijevodima, članci s bogatim strukturiranim poljima,
sustav blokova s pravim deklarativnim registrom, gating objave, revizije, SEO
metapodaci, analitika — sve je tu.

**Loša vijest:** tri pretpostavke iz briefa su netočne, a jedna od njih je zamka koja
tiho ruši produkciju:

1. **Ne postoji „Visual Block Editor"** u smislu platna s drag-and-dropom i živim
   pregledom. Postoji generator formi iz sheme — koristan, ali vizualno je to popis
   `<details>` harmonika sa strelicama za pomicanje i punim reloadom po kliku.
2. **Ne postoji commit „Add dynamic page editor with section management"** — provjereno
   kroz cijelu povijest, sve grane. Ako se brief oslanja na taj rad, taj rad nije ovdje.
3. **Ne postoji `PageTranslation`.** Stranice su jedan red po jeziku, povezane poljem
   `translationKey` koje se **nigdje ne čita**. `/hr/akademija` i `/en/academy` bile bi
   dva nepovezana reda.

**Najveći rizik u cijelom projektu** je sudar ruta opisan u §3. Ne pada build — tiho
404-a u produkciji. Cijeli prijedlog u §4 postoji da ga izbjegne.

---

## 2. Što već postoji (i kako se zove)

### 2.1 Model sadržaja

`Article` (`prisma/schema.prisma:658`) + `ArticleTranslation` (:797) već nose gotovo
sve što brief traži pod novim imenima:

| Brief traži | Već postoji | Gdje |
|---|---|---|
| Key takeaways | `keyTakeawaysJson` | schema:825 |
| Target audience / za koga je | `bestForJson`, `notIdealForJson` | :826-827 |
| Prerequisites / preskoči ako | `varelVerdictBestFor`, `varelVerdictSkipIf` | :835-836 |
| Reviewer + reviewed date | `reviewerId`, `lastReviewedAt` | :682-683 |
| TL;DR / sažetak | `aiSummary`, `directAnswer` | :823-824 |
| Izvori i reference | `sourceReferencesJson` | :830 |
| FAQ | `faqJson` | :803 |
| Kontrola kvalitete prije objave | `seoCompletionScore`, `llmCompletionScore`, `publishChecklistJson` | :839-841 |
| Autor s biografijom, slikom, ekspertizom | `Author` | :747 |
| Predložak strukture članka | `outlineJson` (postoji, **nikad se ne koristi**) | :804 |

**Genuinely nedostaje:** razina težine, format sadržaja, faza poslovanja, redoslijed
lekcija, vrijeme čitanja kao pohranjeno polje, i bilo kakav pojam tečaja ili staze učenja.

Dva polja postoje u shemi i nikad se ne čitaju — `outlineJson` (:804) i
`publishChecklistJson` (:841). To su gotove JSON vreće bez migracije.

### 2.2 Već autorirano, ali se javno ne prikazuje

Ovo je najjeftinija vrijednost u cijelom projektu. Uređivač već sprema, a
`post-article.tsx` **ne renderira**:

- `keyTakeawaysJson` — ključni zaključci
- `sourceReferencesJson` — izvori (postoji `SourcesEditor` u adminu, `post-editor.tsx:670`)
- `bestForJson` / `notIdealForJson`

Akademija ionako treba „Ključni zaključci" sekciju. Ista promjena popravlja i obične članke.

### 2.3 Kategorije

`Category` (:539) ima `parentCategoryId` (hijerarhija), `position`, `isFeatured`, `icon`,
`featuredImageId`, `status`. `CategoryTranslation` (:562) ima `name`, `slug`, `description`
po jeziku. Brief traži još: color token, SEO naslov/opis, index/noindex, broj članaka.
SEO dio je pokriven polimorfnim `SeoMetadata` (`entityType: CATEGORY`). Boja i brojač su novi.

### 2.4 Sustav blokova

`src/lib/blocks-schema.ts` je **pravi deklarativni registar** — `BLOCK_SCHEMAS` s poljima
`{key, label, kind, target}`. Pogoni tri stvari besplatno: dropdown „Dodaj sekciju",
formu za uređivanje bloka, i pretvorbu FormData → JSON pri spremanju.

28 tipova blokova već postoji (`block-renderer.tsx:78`), uključujući `hero`, `cta`,
`newsletter`, `faq`, `category_grid`, `latest_articles`.

**Ali registar je pola posla.** Renderer je paralelni ručno održavan `switch` bez ikakve
compile-time veze s registrom. Dodaš shemu bez rendera → admin popuni blok, u produkciji
se ne prikaže ništa. Dodaš render bez sheme → `saveBlockFields` baci iznimku.

### 2.5 Rutiranje i lokalizacija

Lokalizirani segmenti (`/hr/autori` vs `/en/authors`) rade se kroz **dvije zrcalne mape
ruta** koje se međusobno preusmjeravaju (`authors/[slug]/page.tsx:18`). Nema route mapa,
nema rewritea, `next.config.ts` je prazan po tom pitanju.

`src/lib/post-url.ts` (novo, commit `71ead4d`) je jedini izvor istine za javni URL posta.
`postPath(locale, slug, categorySlug)` → `/{locale}/{kategorija}/{slug}`.

### 2.6 Pretraga

`search/page.tsx` radi četiri odvojena `ILIKE '%q%'` upita bez rangiranja, bez paginacije,
bez tijela članka. Nema full-text indeksa, nema `pg_trgm`, nema `unaccent`, nema GIN indeksa
— provjereno kroz cijelu shemu i migracije.

Dijakritika se **ne normalizira nigdje** na javnoj strani. Pretraga „cakic" ne nalazi
„Čakić". Postojeći NFD normalizator u CRM-u (`crmble/fields.ts:22`) k tome ne hvata `đ`,
jer `đ` nije kompozitni znak.

Dobra vijest: driver je pravi `pg` + `@prisma/adapter-pg`, ne Accelerate i ne Neon HTTP.
Puna Postgres površina je dostupna — `to_tsvector`, `ts_rank_cd`, `unaccent()`, GIN.

---

## 3. Zamka: sudar ruta

**Ovo je jedina stvar u dokumentu koja može tiho srušiti produkciju.**

Trenutno stanje ruta ispod `[locale]`:

```
/[locale]/[slug]              → CMS stranica (page builder)
/[locale]/[slug]/[postSlug]   → post pod svojom kategorijom
/[locale]/guides/…            → statična mapa
/[locale]/tools/…             → statična mapa   (i još ~14 statičnih)
```

Next.js rješava **statični segment prije dinamičkog**, po razini, ne po punoj putanji.

Ako napravimo statičnu mapu `src/app/[locale]/akademija/[slug]/page.tsx`:

1. **`/{bilo koji locale}/akademija/…` prestaje dolaziti do post rute.** Statične mape su
   slijepe na jezik — zato `/de/autori/x` danas postoji kao živi URL.
2. **Ako itko ikad napravi kategoriju čiji je hrvatski slug `akademija`**, `postPath()`
   će generirati `/hr/akademija/{post}`, ali tu putanju hvata statična mapa i post ruta se
   **nikad ne izvrši**. Svi postovi te kategorije 404-aju, dok interne poveznice, canonical,
   breadcrumb i JSON-LD i dalje pokazuju tamo. Ništa ne pukne u buildu.
3. **CMS stranica sa slugom `akademija` postaje trajno nedostupna.**

Da je ovo stvarna klasa problema, a ne teoretska: `post-url.ts:14` **već ima special-case**
za `category === "guides"`, upravo zato što je `guides/` statična mapa.

---

## 4. Prijedlog: Akademija bez ijedne nove rute

Ovo je glavna preporuka dokumenta. Umjesto statičnih mapa, iskoristi činjenicu da su
jednosegmentne i dvosegmentne putanje **različite razine** i ne sudaraju se:

```
/hr/akademija            → CMS stranica sa slugom "akademija"   → [locale]/[slug]
/hr/akademija/{post}     → post čija je kategorija "akademija"  → [locale]/[slug]/[postSlug]
/en/academy              → CMS stranica sa slugom "academy"
/en/academy/{post}       → post u kategoriji s en slugom "academy"
```

Što ovo rješava odjednom:

- **Landing stranica je uređiva kroz block editor** — jer *jest* CMS stranica. To je tvrdi
  zahtjev briefa (§10) i ovako je zadovoljen bez ikakvog novog koda.
- **URL-ovi članaka rade sami** — postojeća `postPath` mašinerija, uključujući 308 s krivih
  kategorija i kanonizaciju, dobiva se besplatno.
- **Nema sudara ruta**, jer nema statičnih mapa.
- **Nema `PageTranslation` problema** — hrvatska i engleska landing stranica ionako su
  dva odvojena reda, što je ovdje ispravno: sadržaj im se razlikuje, ne samo prijevod.

**Cijena:** slug `akademija` postaje rezerviran u dva prostora imena istovremeno (Page i
Category). To mora biti eksplicitno zaštićeno, ne dokumentirano-pa-zaboravljeno. Vidi B1.

### 4.1 Zašto Akademija ipak treba vlastiti marker

Kategorija „akademija" nosi URL, ali ne može nositi 15 tema iz §9 briefa — jer post ima
samo jednu primarnu kategoriju, a ona je potrošena na `akademija`.

Zato: **`Article.contentSection String?`** + `@@index([contentSection, status])`.
Jedna migracija, indeksirano, filtrabilno u admin listi. Teme, težina, format i faza
poslovanja idu u zasebna polja (§5).

Odbačene alternative i razlog:

| Alternativa | Zašto ne |
|---|---|
| Dodati `ACADEMY` u `ArticleType` | Miješa „cornerstone-ost" sa sekcijom; `type` se već renderira kao badge na tri javna mjesta |
| Samo `primaryCategoryId == <magic id>` | Nije čitljivo, magični ID u kodu, ne preživi reseed |
| `secondaryCategoryIdsJson` | Netipizirano, neindeksirano, ne može se filtrirati u SQL-u |
| Tag | Brief eksplicitno traži prvorazrednu sekciju, i s pravom — treba joj vlastiti URL, pretraga i metapodaci |

---

## 5. Predloženi model podataka

Minimalna migracija koja pokriva Fazu 1–5 briefa.

### 5.1 Na `Article` (jezično neovisno)

```prisma
contentSection      String?   // "academy" | null      @@index([contentSection, status])
academyFormat       String?   // lesson | practical-guide | in-depth-guide | checklist |
                              // template | case-study | comparison | tutorial |
                              // business-tool | series | course
academyDifficulty   String?   // beginner | intermediate | advanced
academyStagesJson   Json?     // string[] — faze poslovanja, post može imati više
academyTopicIdsJson Json?     // string[] — ID-evi Category redova (15 tema iz §9)
readingMinutes      Int?      // izračunato pri spremanju, ne u renderu
academyPremium      Boolean   @default(false)
learningPathId      String?
lessonPosition      Int?
```

**Vrijednosti su stabilni interni stringovi, prikazne oznake idu u dictionaries.** Brief
to izričito traži (§40) i to je ispravno — hrvatska oznaka „Početnik" ne smije biti
vrijednost u bazi.

**Zašto `String?` a ne Prisma enumi:** dodavanje vrijednosti u Postgres enum je migracija;
u ovom repou migracije na produkciju idu preko jednokratnih endpointa jer prod
`DATABASE_URL` nije dosežan iz CLI-ja. Formati i faze poslovanja su lista koja će se
mijenjati. Validacija ide u Zod na serveru, gdje je jeftina za promjenu.

### 5.2 Na `ArticleTranslation` (jezično ovisno)

Ništa novo. `learningOutcome` i `academyExcerpt` iz briefa mapiraju se na postojeće
`directAnswer` (:824) i `excerpt` (:801). Prerequisites → `varelVerdictBestFor` ili
neiskorišteni `outlineJson` (:804).

Ako se kasnije pokaže da treba zasebno polje, dodaje se tada — ne unaprijed.

### 5.3 Staze učenja — **ne sada**

`LearningPath` model odgađam do Faze 6. Prva verzija koristi
`academy-learning-paths` blok s ručno odabranim člancima, što brief sam dopušta
(§11.5: „initial implementation may use manually configured collections"). Model bez
stvarnog sadržaja je pogađanje sheme unaprijed.

---

## 6. Adapter za pretragu

Brief (§17.3) traži da se UI ne prepiše kad se jednom prijeđe na Meilisearch. To je
ispravan instinkt i jeftin je ako se granica postavi odmah.

```ts
// src/lib/academy/search/types.ts
export interface AcademySearchAdapter {
  search(input: AcademySearchInput): Promise<AcademySearchResult>;
  suggest(q: string, locale: string): Promise<AcademySuggestion[]>;
}
```

Prva implementacija: `PostgresAcademySearch`, jedan rangirani SQL upit preko
`db.$queryRaw` s tagged-template parametrizacijom.

**Ovo mora biti jedan upit, ne fan-out.** Pool je namjerno `max: 1` po lambdi
(`src/lib/db.ts:11`, promijenjeno danas nakon produkcijskog ispada zbog iscrpljenih
konekcija) — paralelni upiti po zahtjevu bi se serijalizirali na toj jednoj konekciji.

Potrebna DDL migracija:

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

**Prije dizajniranja oko ovoga treba potvrditi da hosting dopušta `CREATE EXTENSION`** —
oba su contrib moduli i traže privilegije. Ako ne dopušta, fallback je ručno preslikavanje
dijakritike u JS prije upita, s pohranjenim normaliziranim stupcem.

Težine iz §17.2 preslikavaju se na `setweight`: naslov A, nadnaslovi B, sažetak C, tijelo D.

**Dijakritika:** NFD dekompozicija ne rješava `đ`. Treba eksplicitna tablica
`č→c, ć→c, š→s, ž→z, đ→d` u obje smjera (upit i indeks).

---

## 7. Zatečeni bugovi na koje ćemo naletjeti

Nađeno tijekom revizije, nije uzrokovano Akademijom, ali stoji na putu:

| # | Problem | Gdje | Zašto smeta |
|---|---|---|---|
| B1 | Kategorija ili stranica sa slugom `akademija`/`academy` tiho razbija rute | `post-url.ts:14` | Nosivi dio prijedloga iz §4 |
| B2 | `saveBlockFields` briše sve ključeve koje shema trenutno ne navodi | `pages.ts:105-141` | Preimenovanje polja bloka = tihi gubitak sadržaja |
| B3 | Registar blokova i renderer nisu vezani tipom | `blocks-schema.ts` ↔ `block-renderer.tsx:78` | 5 novih blokova = 10 nepovezanih izmjena |
| B4 | `publishPost` i `bulkPostAction` zaobilaze `blockingIssues` | `posts.ts:467,558` | Svaki academy publish gate je zaobilazan iz liste |
| B5 | Slugovi nemaju provjeru sudara; `@@unique([languageId, slug])` je globalan | `posts.ts:343` | Sirova Prisma iznimka u licu urednika |
| B6 | Sitemap još emitira `/guides/{slug}` za sve članke | `sitemap.ts:93` | Reklamira 301-ove umjesto kanonskih URL-ova |
| B7 | `buildSeoMetadata` pretpostavlja isti path u svim jezicima | `seo.tsx:30-34` | Ne može izraziti `/hr/akademija` ↔ `/en/academy` |
| B8 | `AnalyticsEventType` enum i `EVENT_TYPES` su razišli | `schema:85` ↔ `api/track/route.ts:6` | `NEWSLETTER_SIGNUP` već vraća 400, tiho |
| B9 | Objava stranice ne provjerava `content.publish` | `pages.ts:31` | WRITER može objaviti landing stranicu |
| B10 | Preview stranice 404-a na draftu | `content.ts:72` | Landing stranica se ne može pregledati prije objave |

B1 i B7 su blokatori za Akademiju. B2 i B3 su blokatori za nove blokove. Ostalo je
tehnički dug koji preporučujem popraviti usput, jer ćemo ionako biti u tim datotekama.

---

## 8. Backlog

Redoslijed je odabran tako da svaka faza završi nečim što se može vidjeti u pregledniku.

**Faza A — temelji i zaštita** (blokira sve ostalo)
- A1 · rezervirani slugovi: `akademija`, `academy` + svi statični segmenti ruta,
  provjera pri spremanju kategorije i stranice → riješen B1
- A2 · migracija: `contentSection` + academy polja na `Article` (§5.1)
- A3 · `src/lib/academy/config.ts` — formati, težine, faze, kao stabilne vrijednosti
- A4 · hrvatske i engleske oznake u dictionaries
- A5 · 15 kategorija tema + roditeljska kategorija „Akademija" (hr `akademija` / en `academy`)

**Faza B — uređivač**
- B1 · „Prikaži u Varel Akademiji" prekidač + Academy panel u `post-editor.tsx`
- B2 · `readingMinutes` se računa pri spremanju; `wordsToMinutes` seli u `src/lib/`
- B3 · admin lista: stupac i filtar Akademija, težina, format
- B4 · popravak B4/B5 iz §7 (publish gate + sudar slugova)

**Faza C — javni članak**
- C1 · Academy varijanta `post-article.tsx`: badge, težina, vrijeme čitanja, vidljivi breadcrumb
- C2 · render `keyTakeawaysJson` i `sourceReferencesJson` — **korist i za obične članke**
- C3 · `--academy` token u `globals.css` (3 linije, §3 revizije prezentacije)
- C4 · prethodna/sljedeća lekcija

**Faza D — pretraga** (najveći pojedinačni komad)
- D1 · DDL: `unaccent`, `pg_trgm`, tsvector stupac, GIN indeks — **tek nakon potvrde da hosting to dopušta**
- D2 · `AcademySearchAdapter` + `PostgresAcademySearch`
- D3 · `/api/academy/search` + generički rate limiter (danas ga nema, tri rute ga ručno prepisuju)
- D4 · UI: filtri, chipovi, sortiranje, URL state, Load More, prazna stanja
- D5 · fasete s brojačima

**Faza E — landing stranica**
- E1 · popravak B2 i B3 iz §7 — **prije** pisanja novih blokova
- E2 · novi `kind: "repeater"` u registru blokova (bez njega kartice faza poslovanja nisu izvedive)
- E3 · blokovi: `academy-hero`, `academy-category-grid`, `academy-featured`, `academy-search-library`, `academy-learning-paths`
- E4 · seed hrvatske i engleske landing stranice tekstom iz §14–16 briefa

**Faza F — navigacija, SEO, analitika**
- F1 · stavke izbornika (DB-driven, plus hardkodirani fallback u `site-header.tsx:30`)
- F2 · sitemap: Akademija + popravak B6
- F3 · hreflang za lokalizirane segmente → popravak B7
- F4 · schema.org: `Article`/`TechArticle`, `BreadcrumbList`. **Ne `Course`** dok ne postoji stvarni tečaj
- F5 · analitika + popravak B8

**Faza G — odgođeno** (brief §8 „future-ready", ne blokira lansiranje)
- staze učenja kao model, tečajevi, premium, napredak korisnika, certifikati, spremljeni članci

---

## 9. Što preporučujem izbaciti iz prve verzije

Brief je opsežan i to je dobro za smjer, ali nekoliko stavki nose puno rizika za malo koristi
dok Akademija ima nula članaka:

- **Migracija postojećih vodiča u Akademiju** (§44). Brief i sam kaže „ne automatski".
  Predlažem da to ne bude alat nego ručna odluka po članku dok ih je manje od dvadeset.
- **Fasete s brojačima** (§41). Skupe su u SQL-u; s malo sadržaja daju malo. Faza D5, nakon
  što ostatak pretrage radi.
- **Prijedlozi pri tipkanju** (§26). Traže poseban endpoint i rate limiting. Vrijedni tek
  kad ima što predlagati.
- **`Course` schema.org** (§32). Brief to sam zabranjuje za obične članke — spominjem jer
  je lako slučajno dodati.
- **Praćenje napretka i certifikati** (§8). Traže korisničke račune na javnoj strani, kojih
  danas nema.

Preporuka: lansirati s Fazama A–C i F, s pretragom (D) kao odmah sljedećim korakom.
Landing stranica (E) može krenuti s postojećim blokovima (`hero`, `category_grid`,
`cta`, `newsletter`) i dobiti namjenske Academy blokove kad E1/E2 budu gotovi.

---

## 10. Otvorena pitanja za vlasnika

1. **Dopušta li hosting `CREATE EXTENSION unaccent` i `pg_trgm`?** Ovo mijenja dizajn
   pretrage. Ako ne, ide se na normalizirani stupac održavan iz aplikacije.
2. **Jesu li teme (15 kategorija iz §9) zaista kategorije, ili zasebna taksonomija?**
   Prijedlog ih drži kao `Category` redove referencirane kroz `academyTopicIdsJson`, čime
   ne troše primarnu kategoriju. Alternativa je novi model.
3. **Ide li Akademija odmah na produkciju ili iza feature flaga?** Postoji presedan —
   HVAC B2B je cijelo vrijeme iza `HVAC_B2B_ENABLED`.
4. **Tko piše sadržaj?** Trideset praznih kategorija izgleda gore od pet punih. Ovo
   utječe na to koliko tema seedati u A5.
