import { redirect } from "next/navigation";
import { requireElectroContextAnyStatus } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { isOperational } from "@/lib/electro/subscription";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, { title: string; text: string }> = {
  PENDING_APPROVAL: {
    title: "Registracija čeka odobrenje",
    text: "Varel tim pregledava zahtjev vaše tvrtke. Obavijestit ćemo vas e-mailom čim registracija bude odobrena — tada počinje probno razdoblje od 10 dana.",
  },
  EXPIRED: {
    title: "Probno razdoblje je isteklo",
    text: "Podaci vaše tvrtke su sačuvani. Za nastavak rada javite se Varel timu radi aktivacije pretplate ili produženja probnog razdoblja.",
  },
  SUSPENDED: {
    title: "Pristup je privremeno obustavljen",
    text: "Pristup aplikaciji je suspendiran. Podaci nisu obrisani. Za više informacija i ponovnu aktivaciju kontaktirajte Varel tim.",
  },
  PAST_DUE: {
    title: "Pretplata čeka uplatu",
    text: "Evidentirali smo dospjelu, a nepodmirenu pretplatu. Podmirite otvorene stavke ili nam se javite kako pristup ne bi bio obustavljen.",
  },
  CANCELLED: {
    title: "Pretplata je otkazana",
    text: "Pretplata vaše tvrtke je otkazana. Za ponovnu aktivaciju kontaktirajte Varel tim.",
  },
};

/** Reachable for blocked companies (brief §73) — explains why and what next. */
export default async function ElectroStatusPage() {
  const ctx = await requireElectroContextAnyStatus();
  if (isOperational(ctx.status)) redirect(`${ELECTRO_APP_BASE}/dashboard`);
  const msg = MESSAGES[ctx.status] ?? MESSAGES.SUSPENDED;

  return (
    <div className={`mx-auto max-w-lg ${electroCardCls}`}>
      <h1 className="text-xl font-bold">{msg.title}</h1>
      <p className="mt-2 text-sm text-muted">{msg.text}</p>
      {ctx.subscription.suspensionReason && ctx.status === "SUSPENDED" && (
        <p className="mt-3 rounded-lg bg-black/5 px-3 py-2 text-sm dark:bg-white/5">
          Razlog: {ctx.subscription.suspensionReason}
        </p>
      )}
      <p className="mt-4 text-sm text-muted">
        Kontakt: <a href="mailto:info@varel.io" className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">info@varel.io</a>
      </p>
    </div>
  );
}
