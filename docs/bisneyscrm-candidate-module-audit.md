# Bisneys CRM — Candidate Module Audit (brief §3)

Pre-implementation audit of the existing Bisneys code before building the
**Candidate Database / HR Talent Intelligence** module. No code is changed by
this document. Goal: what exists, what to reuse, what to extend, migration
risks, duplicates, order, data-loss risks, rollback.

## 1. Where Bisneys CRM lives / stack

- Route group `src/app/(bisneyscrm)/bisneyscrm/**` (Next.js **App Router**), live
  at `https://varel.io/bisneyscrm`, feature-flagged by `BISNEYS_CRM_ENABLED`.
- **Prisma 7** (client `@/generated/prisma`, adapter-pg), single shared
  `prisma/schema.prisma`; all Bisneys models prefixed `Bisneys*` (tables
  `bisneys_*`). Prod migrated via one-shot token endpoints (prod DATABASE_URL
  is runtime-only).
- Auth: separate `BisneysUser` + jose session cookie `bisneys_session`; roles
  **SUPERADMIN / ADMIN**; guards `requireBisneysUser` / `requireBisneysSuperadmin`
  (`src/lib/bisneyscrm/auth/guard.ts`). All authz server-side.
- i18n: Croatian UI, English code (no per-string i18n framework — plain HR strings).
- Storage: Varel has **Vercel Blob** (`src/lib/storage.ts`) — reusable for CVs.

## 2. Existing candidate-relevant models (schema.prisma)

| Model | Role | Notes |
| --- | --- | --- |
| `BisneysPerson` | **central Person** | already extended (linkedin, avatar, headline, verification, scores). Candidate ties via `personId`. |
| `BisneysCandidate` | **= CandidateProfile** | `personId @unique`, single `status: BisneysCandidateStatus`, source, recruiterId, seniority, yearsExperience, education (free text), currentEmployer/Position, expectedSalary, availability, drivingLicense, willingToRelocate/FieldWork, rating, notes, Trello linkage (externalId/rawData), `possibleDuplicate`, soft-delete. |
| `BisneysCandidateStatusHistory` | status log | fromStatus/toStatus/changedById/jobId/note/source. |
| `BisneysCandidateProfession` | candidate↔profession | isPrimary. |
| `BisneysCandidateJob` | **≈ CandidateApplication (thin)** | candidate↔job + `stage` string. No rich status/source/history. |
| `BisneysCandidateEmployment` | legacy employment | **superseded** by `BisneysEmployment` (relationship engine). |
| `BisneysCandidateLanguage` | languages | language + level string. |
| `BisneysProfession` / `BisneysProfessionAlias` | profession catalogue | basic (name/alias). No category/related. |
| `BisneysJob` | **≈ JobOpening** | title, professionId, companyId(client), location, headcount, salary, status(string), recruiter, external Trello. |
| `BisneysEmployment` | structured employment | new (Person↔Company, dates, isCurrent). |
| `BisneysRelationship*` | relationship engine | pathfinder/network/scores in `lib/bisneyscrm/relationships/*`. |
| `BisneysDocument` | documents (loose refs) | has companyId/candidateId/entityType; storage **not yet wired**. |
| `BisneysActivity` / `BisneysAuditLog` | activity + audit | `bisneysAudit()` writer; `BisneysActivity` high-volume feed. |
| `BisneysTrello*` (Connection/Board/List/Card/Member/Webhook/WebhookEvent/SyncLog) | Trello integration | full sync + webhook + list→status mapping. `sync.ts ensureCandidateFromCard` = basic card→candidate. |

`enum BisneysCandidateStatus` (single, 15 values NEW…UNREACHABLE) — **this is the
core gap**: the brief needs **three** separate status machines.

## 3. Existing routes / components to reuse

- Routes: `/candidates` (list, filters, pagination, CSV), `/candidates/novi`,
  `/candidates/[id]` (profile + status history + linked jobs), `/candidates/[id]/uredi`.
  Server action `bisneys-candidates.ts` (saveCandidate creates Person+Candidate,
  status history, linkCandidateToJob, archive).
- **Reusable UI** (`src/components/bisneyscrm/shared/ui.tsx`): `DataTable`,
  `FilterBar`, `Pagination`, `Field/TextInput/TextArea/SelectInput`, `StatusPill`,
  `DetailCard/DetailRow`, `LinkButton`, `BackLink`. Plus `candidate-form.tsx`,
  dashboard KPI/leaderboard components, relationship graph/network components.
- Shared libs: `format.ts` (labels, money, dates), `forms.ts` (parsers, `toCsv`),
  `dedup.ts` (person/company/candidate duplicate detection + merge), `audit.ts`,
  `dashboard.ts` (period/groupBy helpers), full Trello client/sync, relationship
  engine (`pathfinder/score/network/suggestions`).
- CSV export route `/api/bisneyscrm/export/[entity]` (candidates supported).

## 4. Models to EXTEND vs ADD

**Extend (in place, additive columns):**
- `BisneysCandidate` → the CandidateProfile: add `profileStatus` (new enum), split
  recruitment status out to applications; add educationLevel(enum), availability
  fields, relocation/fieldwork enums, salary min/max + currency, candidateScore,
  completenessScore, privacy fields (privacyStatus/legalBasis/consent/retention/
  doNotContact), normalized phone/email lift to Person.
- `BisneysPerson`: add `normalizedPhone`, `normalizedEmail` (+ indexes) for dedup/search.
- `BisneysProfession`: add `categoryId`, `disciplineId?`, `isActive`.
- `BisneysJob` → JobOpening: add client/campaign/hardRequirements JSON.

**Add (new `Bisneys*` models):** `BisneysProfessionCategory`, `BisneysRelatedProfession`,
`BisneysSkill`, `BisneysCandidateSkill`, `BisneysCertification`,
`BisneysCandidateCertification`, `BisneysEducationRecord`,
`BisneysCandidateDrivingLicense`, `BisneysCandidatePreference`,
`BisneysRecruitmentCampaign`, `BisneysCandidateApplication` (+ `BisneysApplicationStatusHistory`),
`BisneysContactAttempt`, `BisneysInterview` (+ `BisneysInterviewStatusHistory`),
`BisneysAssessmentTemplate/Section/Question`, `BisneysCandidateAssessment/AssessmentAnswer`,
`BisneysCandidateTag/TagAssignment`, `BisneysTalentPool/Member`,
`BisneysSavedCandidateView`, `BisneysCandidateMergeLog`, `BisneysCandidateSourceReference`.
Enums: `BisneysCandidateProfileStatus`, `BisneysApplicationStatus`,
`BisneysInterviewStatus`, `BisneysEducationLevel`, `BisneysAvailabilityStatus`,
`BisneysRelocationPreference`, `BisneysFieldWorkPreference`, `BisneysExperienceLevel`,
`BisneysContactChannel`, `BisneysContactOutcome`, `BisneysCandidateSource`,
`BisneysLanguageLevel`, `BisneysAssessmentRecommendation`.

## 5. Migration risks

- **Status split** is the main risk. Plan: **keep** `BisneysCandidate.status`
  (legacy) during transition; add `profileStatus`; move recruitment lifecycle to
  `BisneysCandidateApplication.status`. Backfill: legacy status → nearest
  application status on the candidate's primary job; profileStatus defaults ACTIVE.
- `BisneysCandidateEmployment` (legacy) vs `BisneysEmployment` (new) — **duplicate
  concept**. Consolidate on `BisneysEmployment`; migrate any legacy rows; keep the
  old table until backfilled, then deprecate.
- `BisneysCandidateJob` vs `BisneysCandidateApplication` — evolve: create
  applications from existing candidateJobs (idempotent), keep candidateJob for now.
- Prod candidate data is currently minimal (test-only; module recently went live),
  so data-loss risk is **low** — but all migrations must be idempotent (§49).
- All ALTER ADD COLUMN must be nullable or defaulted (safe on existing rows), per
  the pattern used for the relationship-engine delta.

## 6. Possible duplicates to avoid

- Do **not** create a new `Candidate` node/entity separate from `Person` — the
  Person↔CandidateProfile split already exists (`BisneysCandidate.personId @unique`).
- Documents: reuse `BisneysDocument` (add candidate scoping) rather than a new
  `CandidateDocument` table unless field needs diverge materially.
- Languages: `BisneysCandidateLanguage` exists — extend to A1..NATIVE enum rather
  than a new model.
- Employment: consolidate to `BisneysEmployment`.

## 7. Data that could be lost + mitigations

- Splitting status → risk of losing the historical single status. Mitigation:
  keep the legacy column + `BisneysCandidateStatusHistory`; never drop.
- Free-text `education` on candidate → structured `BisneysEducationRecord`.
  Mitigation: keep the free-text field, migrate best-effort, never delete original.
- Trello `rawData` retained on cards/candidates (debug + reprocess).

## 8. Proposed implementation order (brief §50)

1. **Audit** (this doc) + migration plan. ← *now*
2. Foundation models: Profession catalogue (category/alias/related) + rich seed
   (§8), CandidateProfile evolution, Skill/Certification/Education/Language/Licence,
   Preference; migrations (local + prod delta endpoint); idempotent.
3. Core UI: candidate list (server-side), form, profile, search, base filters
   (English routes new/edit + keep existing).
4. Recruitment process: JobOpening, CandidateApplication + statuses + history,
   ContactAttempt, Interview + statuses, unified timeline, derived flags
   (Nije odgovorio / Potvrdio / Došao).
5. Assessments: Upitnik + Intervju, templates + scorecards per profession.
6. Advanced DB: advanced filters (AND/OR, profession alias engine), saved views,
   talent pools, bulk actions, CSV export.
7. Integrations: Trello candidate parser + label mapping + source conflicts;
   CSV/XLSX import wizard.
8. Intelligence: candidate quality score + job match score (explainable, hard
   requirements), data-quality center, dedup/merge, relationship + company-access.
9. Stabilization: performance/indexes, security, tests, audit, docs, prod build.

## 9. Rollback plan

- All migrations additive (new tables + nullable/defaulted columns); no drops of
  existing columns/tables during the build.
- New UI behind the existing `BISNEYS_CRM_ENABLED` flag; new advanced pages can be
  gated per-route if needed.
- Each phase is its own commit + one-shot prod delta endpoint (idempotent,
  `skip already-exists`), removed after run — same proven pattern.
- Revert = drop the new `bisneys_*` tables + the added columns; legacy candidate
  flow (`BisneysCandidate.status`, existing pages) keeps working untouched.

## 10. Manual checks required before/after (brief §53)

Existing candidates + duplicates; Trello label mappings; old→new status mapping;
seeded professions vs real Bisneys data; assessment templates; prod permissions;
privacy/retention; performance at real volume.
