# Bisneys CRM — Modul kandidata / HR Talent Intelligence (Faze 5–9)

Ovaj dokument pokriva napredni modul baze kandidata izgrađen u fazama 5–9, unutar
izoliranog `(bisneyscrm)` route-groupa Varel repozitorija. Sve tablice imaju prefiks
`bisneys_`, svi modeli `Bisneys*`, modul je iza feature-flaga `BISNEYS_CRM_ENABLED`.

## Faza 5 — Procjene (scorecard predlošci)

- **Modeli:** `BisneysAssessmentTemplate` → `Section` → `Question`, te
  `BisneysCandidateAssessment` → `Answer`. Enumi `BisneysAssessmentKind`
  (`QUESTIONNAIRE` / `INTERVIEW`) i `BisneysAssessmentRecommendation`
  (`STRONG_YES`…`STRONG_NO`).
- **Predlošci:** općeniti Upitnik i Intervju + scorecardi po zanimanju (monter
  metalnih konstrukcija, HVAC serviser, inženjer elektrotehnike, samostalni
  računovođa). Eliminacijska pitanja (npr. „F-gas certifikat", „višednevni teren").
  Superadmin ih učita gumbom **Seedaj predloške** na `/bisneyscrm/assessments`
  (idempotentno — `ensureAssessmentTemplates()`).
- **Ispunjavanje:** `/bisneyscrm/candidates/[id]/assess?templateId=…`. Ocjena 0–10 po
  pitanju, težinski ukupni rezultat, normalizacija na 0–10, preporuka izvedena iz
  rezultata (ili ručno). Ako je eliminacijsko pitanje ocijenjeno 0 → kandidat
  označen `eliminated`.
- **Prikaz:** kartica „Procjene" na profilu kandidata (zadnji Upitnik + Intervju +
  povijest).
- **Bodovanje:** `assessment-score.ts` (`recommendationFromScore`,
  `candidateAssessmentSummary`).

## Faza 6 — Napredni filteri, spremljeni prikazi, talent pools, bulk akcije

- **Napredni filter (AND/OR):** `filter-core.ts` (čista logika, unit-testirana) +
  `filter-engine.ts` (labeli/opcije za UI). Graditelj uvjeta u
  `candidates-interactive.tsx`; filter se serijalizira u URL param `?f=<JSON>`.
  Specijalna polja (zanimanje preko alias-enginea, talent pool) rješavaju se
  asinkrono i uvijek sužavaju (AND semantika).
- **Spremljeni prikazi:** `BisneysSavedView` (po korisniku, opcionalno dijeljeni).
  Spremaju se iz filter-panela; prikazani kao čipovi iznad liste.
- **Talent pools:** `BisneysTalentPool` + `Member` (unique `poolId+candidateId`).
  Stranice `/bisneyscrm/talent-pools`. Kandidati se dodaju bulk-akcijom.
- **Bulk akcije:** odabir kandidata (checkbox) → `bulkCandidateAction`: postavi
  status, dodaj/ukloni tag, dodaj u talent pool, arhiviraj. Tagovi su
  `BisneysCandidate.tags String[]`.

## Faza 7 — Uvoz (CSV/XLSX) + Trello parser

- **CSV/TSV parser:** `import/csv.ts` — bez vanjskih ovisnosti; auto-detekcija
  delimitera (`, ; \t`), navodnici, ugniježđeni retci/zarezi, BOM, CRLF.
  **XLSX:** korisnik spremi kao CSV u Excelu (nije dodana dijeljena ovisnost).
- **Čarobnjak:** `/bisneyscrm/candidates/import` (4 koraka) — Podaci → Mapiranje
  (auto-pogodak `guessMapping`) → Pregled + dedup → Uvoz. Dedup po normaliziranom
  emailu/telefonu (u datoteci i u bazi); opcija „Preskoči duplikate".
- **Trello parser:** `import/trello-parse.ts` — iz naslova/opisa/labela kartice vadi
  ime, email, telefon, tagove; label-map (`BisneysSetting "candidate_label_map"`)
  mapira labele na zanimanje/status/tag. `importCandidatesFromTrello()` parsira
  sinkronizirane `BisneysTrelloCard` zapise i uvozi ih (skip duplikata).

## Faza 8 — Match score + centar kvalitete podataka

- **Match score:** `match-core.ts` (čista logika, unit-testirana) + `match-score.ts`
  (DB fan-out). Rezultat 0–100 kroz 6 objašnjivih faktora: zanimanje (40),
  lokacija (15), plaća (15), dostupnost (12), iskustvo (10), teren/zahtjevi (8).
  Svaki faktor ima bodove i tekstualno obrazloženje. Prikazano kao rangirana lista
  „Podudarni kandidati" na profilu posla (proširiv breakdown).
- **Centar kvalitete:** `data-quality.ts` + `/bisneyscrm/data-quality`. Popunjenost
  po kandidatu (9 provjera), distribucija, statistike (bez kontakta, bez zanimanja,
  <50% popunjeno, neaktivni >90 dana, mogući duplikati), lista najnepotpunijih.
- **Dedup/merge:** postojeći `/bisneyscrm/settings/duplicates` (Phase G); centar
  kvalitete linka na njega.

## Faza 9 — Performanse, testovi, dokumentacija

- **Performanse:** indeksi na svim novim FK-ovima i čestim filterima (`kind`,
  `candidateId`, `poolId`, `userId`, `entityType`). Napomena: `previewCandidateImport`
  radi jedan upit po retku (prihvatljivo za tipične uvoze; za vrlo velike datoteke
  razmotriti batch po `normalizedEmail`/`normalizedPhone`).
- **Testovi:** `tests/bisneys/*.test.ts` (Node built-in runner). Pokrivaju čiste
  module: `csv` (parsiranje/mapiranje), `filter-core` (AND/OR where-builder,
  parse param), `match-core` (bodovanje/objašnjenja), `trello-parse` (ekstrakcija).
  Pokreni: `npm test`. Konvencija: unit-testiraju se samo samostalni moduli bez
  `@/` value-importa (Node ESM runner ih ne resolvira); zato su čiste jezgre
  (`*-core.ts`) odvojene od DB slojeva.
- **Migracije (prod):** aditivne, bisneys-only, kroz jednokratne token-gated rute
  (`/api/bisneyscrm/migrate-assessments`, `/api/bisneyscrm/migrate-pools`) — vidi
  runbook u `docs/bisneyscrm.md`.

## Ključne datoteke

| Sloj | Datoteka |
| --- | --- |
| Procjene (logika) | `src/lib/bisneyscrm/candidates/assessment-{seed,score}.ts` |
| Filter (jezgra/UI) | `src/lib/bisneyscrm/candidates/filter-{core,engine}.ts` |
| Uvoz | `src/lib/bisneyscrm/import/{csv,trello-parse}.ts` |
| Match (jezgra/DB) | `src/lib/bisneyscrm/candidates/match-{core,score}.ts` |
| Kvaliteta | `src/lib/bisneyscrm/candidates/data-quality.ts` |
| Server akcije | `src/server/actions/bisneys-{assessments,candidate-ops,import}.ts` |
| Testovi | `tests/bisneys/*.test.ts` |
