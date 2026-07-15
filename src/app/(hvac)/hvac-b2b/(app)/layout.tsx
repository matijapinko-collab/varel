import { redirect } from "next/navigation";
import { isHvacB2bEnabled } from "@/lib/hvac/b2b-auth";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { HvacAppShell } from "@/components/hvac/b2b/app-shell";

export const dynamic = "force-dynamic";

export default async function HvacAppLayout({ children }: { children: React.ReactNode }) {
  if (!isHvacB2bEnabled()) redirect("/hvac-b2b");
  const ctx = await requireTenantContext();

  return (
    <HvacAppShell
      tenantName={ctx.tenant.name}
      userName={ctx.user.name}
      role={ctx.role}
      plan={ctx.tenant.plan}
      status={ctx.tenant.status}
      unverified={!ctx.user.emailVerifiedAt}
    >
      {children}
    </HvacAppShell>
  );
}
