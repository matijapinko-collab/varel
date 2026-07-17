import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { archiveCompany } from "@/server/actions/bisneys-companies";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink, DetailCard, DetailRow, StatusPill, LinkButton } from "@/components/bisneyscrm/shared/ui";
import { SALES_STATUS_LABELS } from "@/lib/bisneyscrm/trello/mapping";
import { money, shortDate, dateTime } from "@/lib/bisneyscrm/format";
import { listInteractions } from "@/lib/bisneyscrm/interactions/service";
import { InteractionsTimeline, type InteractionRow } from "@/components/bisneyscrm/companies/interactions-timeline";
import { companyCandidateSummary } from "@/lib/bisneyscrm/companies/candidate-links";
import { CompanyCandidates } from "@/components/bisneyscrm/companies/company-candidates";
import { companyAccessSummary } from "@/lib/bisneyscrm/companies/access";
import { CompanyWallCard, type CompanyWallProfileView } from "@/components/bisneyscrm/companies/companywall-card";
import { CompanyTabs } from "@/components/bisneyscrm/companies/company-tabs";

export const dynamic = "force-dynamic";

export default async function CompanyProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireBisneysUser();
  const { id } = await params;
  const sp = await searchParams;
  const cwMsg = typeof sp.cw === "string" && sp.cw !== "ok" ? decodeURIComponent(sp.cw) : undefined;

  const c = await db.bisneysCompany.findFirst({
    where: { id, deletedAt: null },
    include: {
      contacts: { include: { person: true } },
      deals: { orderBy: { createdAt: "desc" } },
      companyWall: true,
      _count: { select: { jobs: true } },
    },
  });
  if (!c) notFound();

  const activities = await db.bisneysActivity.findMany({
    where: { companyId: c.id }, orderBy: { occurredAt: "desc" }, take: 15,
  });
  const [candidateSummary, candidateOptions] = await Promise.all([
    companyCandidateSummary(c.id),
    db.bisneysCandidate.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 300, include: { person: { select: { fullName: true } } } }),
  ]);
  const candOpts = candidateOptions.map((c) => ({ id: c.id, name: c.person.fullName }));

  const access = await companyAccessSummary(c.id);
  const cwProfile: CompanyWallProfileView | null = c.companyWall ? {
    legalName: c.companyWall.legalName, oib: c.companyWall.oib, mbs: c.companyWall.mbs, status: c.companyWall.status,
    legalForm: c.companyWall.legalForm, vatStatus: c.companyWall.vatStatus,
    foundedAt: c.companyWall.foundedAt?.toISOString() ?? null,
    address: c.companyWall.address, city: c.companyWall.city, postalCode: c.companyWall.postalCode,
    nkd: c.companyWall.nkd, activity: c.companyWall.activity, employeeCount: c.companyWall.employeeCount,
    revenue: c.companyWall.revenue ? String(c.companyWall.revenue) : null, creditRating: c.companyWall.creditRating,
    source: c.companyWall.source, fetchedAt: c.companyWall.fetchedAt?.toISOString() ?? null,
  } : null;

  const interactionRows = await listInteractions({ companyId: c.id }, 200);
  const interactions: InteractionRow[] = interactionRows.map((i) => ({
    id: i.id, type: i.type, source: i.source, rawContent: i.rawContent, title: i.title,
    actorName: i.actorName, parsedContactName: i.parsedContactName, needsReview: i.needsReview,
    edited: i.edited, externalUrl: i.externalUrl, occurredAt: i.occurredAt.toISOString(),
  }));

  return (
    <div className="max-w-4xl">
      <BackLink href="/bisneyscrm/companies">Tvrtke</BackLink>
      <BisneysPageHeader title={c.name} description={c.industry ?? undefined}>
        <StatusPill status={c.status} label={SALES_STATUS_LABELS[c.status]} />
        <LinkButton href={`/bisneyscrm/companies/${c.id}/uredi`} variant="ghost">Uredi</LinkButton>
        <form action={archiveCompany.bind(null, c.id)}>
          <button type="submit" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-red-500 hover:border-red-400">Arhiviraj</button>
        </form>
      </BisneysPageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        {cwProfile && <span className="rounded-full bg-blue-500/10 px-2 py-1 font-medium text-blue-600">CompanyWall ✓</span>}
        {c.externalId && <span className="rounded-full bg-sky-500/10 px-2 py-1 font-medium text-sky-600">Trello povezano</span>}
        {c.deals.length > 0 && <span className="rounded-full bg-indigo-500/10 px-2 py-1 font-medium text-indigo-600">Deal</span>}
        {(cwProfile?.oib ?? c.oib) && <span className="rounded-full border border-border px-2 py-1 text-muted">OIB: {cwProfile?.oib ?? c.oib}</span>}
        {c.city && <span className="rounded-full border border-border px-2 py-1 text-muted">{c.city}</span>}
        {cwProfile?.employeeCount != null && <span className="rounded-full border border-border px-2 py-1 text-muted">{cwProfile.employeeCount} zaposlenih</span>}
        <span className="rounded-full border border-border px-2 py-1 text-muted">Pipeline: {money(c.dealValue, c.currency ?? "EUR")}</span>
        {c.nextFollowUpAt && <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-600">Follow-up: {shortDate(c.nextFollowUpAt)}</span>}
        {interactions[0] && <span className="rounded-full border border-border px-2 py-1 text-muted">Zadnja interakcija: {shortDate(new Date(interactions[0].occurredAt))}</span>}
      </div>

      <CompanyTabs tabs={[
        { key: "pregled", label: "Pregled", content: (
        <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
        <DetailCard title="Osnovni podaci">
          <dl>
            <DetailRow label="Pravni naziv">{c.legalName ?? "—"}</DetailRow>
            <DetailRow label="OIB">{c.oib ?? "—"}</DetailRow>
            <DetailRow label="Web">{c.website ? <a href={c.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-300">{c.website}</a> : "—"}</DetailRow>
            <DetailRow label="Grad / država">{[c.city, c.country].filter(Boolean).join(", ") || "—"}</DetailRow>
            <DetailRow label="Telefon">{c.phone ?? "—"}</DetailRow>
            <DetailRow label="Email">{c.email ?? "—"}</DetailRow>
          </dl>
        </DetailCard>

        <DetailCard title="Sales">
          <dl>
            <DetailRow label="Status"><StatusPill status={c.status} label={SALES_STATUS_LABELS[c.status]} /></DetailRow>
            <DetailRow label="Vrijednost posla">{money(c.dealValue, c.currency ?? "EUR")}</DetailRow>
            <DetailRow label="Vjerojatnost">{c.closeProbability != null ? `${c.closeProbability} %` : "—"}</DetailRow>
            <DetailRow label="Očekivano zatvaranje">{shortDate(c.expectedCloseDate)}</DetailRow>
            <DetailRow label="Sljedeći follow-up">{shortDate(c.nextFollowUpAt)}</DetailRow>
            <DetailRow label="Izvor leada">{c.leadSource ?? "—"}</DetailRow>
          </dl>
        </DetailCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <DetailCard title={`Kontakti (${c.contacts.length})`}>
          {c.contacts.length === 0 ? (
            <p className="text-sm text-muted">Nema povezanih kontakata.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {c.contacts.map((ct) => (
                <li key={ct.id} className="flex items-center justify-between">
                  <Link href={`/bisneyscrm/people/${ct.personId}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{ct.person.fullName}</Link>
                  <span className="text-muted">{ct.title ?? ct.email ?? ct.phone ?? ""}</span>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>

        <DetailCard title={`Poslovi / dealovi`}>
          {c.deals.length === 0 ? (
            <p className="text-sm text-muted">Nema dealova.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {c.deals.map((d) => (
                <li key={d.id} className="flex items-center justify-between">
                  <span>{d.name}</span>
                  <span className="tabular-nums font-medium">{money(d.amount, d.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
      </div>

      <div className="mt-4">
        <CompanyWallCard companyId={c.id} profile={cwProfile} message={cwMsg} />
      </div>

      <div className="mt-4">
        <DetailCard title="Pristup tvrtki" action={<Link href={`/bisneyscrm/relationships/company-entry?companyId=${c.id}`} className="text-sm font-semibold text-indigo-500 hover:underline">Pronađi ulaz →</Link>}>
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-border px-3 py-2 text-center"><div className={`text-lg font-bold tabular-nums ${access.directContacts === 0 ? "text-red-500" : ""}`}>{access.directContacts}</div><div className="text-[11px] text-muted">Direktni kontakti</div></div>
            <div className="rounded-xl border border-border px-3 py-2 text-center"><div className="text-lg font-bold tabular-nums">{access.currentEmployees}</div><div className="text-[11px] text-muted">Trenutačni zaposlenici</div></div>
            <div className="rounded-xl border border-border px-3 py-2 text-center"><div className="text-lg font-bold tabular-nums">{access.formerEmployees}</div><div className="text-[11px] text-muted">Bivši zaposlenici</div></div>
            <div className="rounded-xl border border-border px-3 py-2 text-center"><div className="text-lg font-bold tabular-nums">{access.totalInsiders}</div><div className="text-[11px] text-muted">Insideri u bazi</div></div>
          </div>
          {access.candidateEntries.length > 0 ? (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted">Kandidati kao mogući ulaz</p>
              <ul className="divide-y divide-border text-sm">
                {access.candidateEntries.map((e) => (
                  <li key={e.candidateId} className="flex items-center justify-between py-1.5">
                    <Link href={`/bisneyscrm/candidates/${e.candidateId}`} className="font-medium hover:text-indigo-500">{e.name}</Link>
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600">{e.relationLabel}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted">{access.directContacts === 0 ? "Nema direktnog kontakta ni insidera u bazi. Traži indirektni put preko mreže odnosa." : "Nema kandidata kao izravnog ulaza."}</p>
          )}
        </DetailCard>
      </div>

        </div>
        ) },
        { key: "interakcije", label: "Interakcije", badge: interactions.length, content: (
          <InteractionsTimeline companyId={c.id} interactions={interactions} />
        ) },
        { key: "kandidati", label: "Kandidati", badge: candidateSummary.counts.total, content: (
          <CompanyCandidates companyId={c.id} summary={candidateSummary} candidateOptions={candOpts} />
        ) },
        { key: "aktivnosti", label: "Aktivnosti", content: (
          <DetailCard title="Aktivnosti">
          {activities.length === 0 ? (
            <p className="text-sm text-muted">Još nema aktivnosti za ovu tvrtku.</p>
          ) : (
            <ul className="space-y-3">
              {activities.map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  <div>
                    <span className="font-medium">{a.type}</span>
                    {a.oldValue || a.newValue ? <span className="text-muted"> · {a.oldValue ?? "—"} → {a.newValue ?? "—"}</span> : null}
                    <div className="text-xs text-muted">{a.actorName ?? "Sustav"} · {dateTime(a.occurredAt)} · {a.source}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          </DetailCard>
        ) },
      ]} />
    </div>
  );
}
