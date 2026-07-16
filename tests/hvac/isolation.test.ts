import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const actionsDir = join(dirname(fileURLToPath(import.meta.url)), "../../src/server/actions");

/**
 * Structural guard: every HVAC server-action module must route through a
 * tenant/superadmin/flag guard before touching the database. This catches the
 * highest-impact multi-tenant bug class — an action that forgets to scope by
 * tenant — without needing a live database.
 */
const GUARDS = /require(TenantContext|TenantRole|Superadmin)|isHvacB2bEnabled|requirePermission/;

// Auth actions establish the session themselves, so they are exempt.
const EXEMPT = new Set(["hvac-b2b-auth.ts", "hvac-superadmin.ts"]);

function hvacActionFiles(): string[] {
  return readdirSync(actionsDir)
    .filter((f) => f.startsWith("hvac-") && f.endsWith(".ts") && !f.includes(" 2."))
    .filter((f) => !EXEMPT.has(f));
}

test("every HVAC action file imports a tenant/authorization guard", () => {
  for (const file of hvacActionFiles()) {
    const src = readFileSync(join(actionsDir, file), "utf8");
    assert.ok(GUARDS.test(src), `${file} must use a tenant/authorization guard`);
  }
});

test("every exported HVAC action calls a guard in its body", () => {
  for (const file of hvacActionFiles()) {
    const src = readFileSync(join(actionsDir, file), "utf8");
    // Split into top-level exported function bodies and check each calls a guard.
    const fnRegex = /export async function (\w+)\s*\(([^)]*)\)\s*(?::[^\{]+)?\{/g;
    let m: RegExpExecArray | null;
    const offenders: string[] = [];
    while ((m = fnRegex.exec(src))) {
      const [, name, params] = m;
      // Internal helpers receive an already-authorized tenantId as their first
      // argument (e.g. shared with the authenticated cron) — not entry points.
      if (/^\s*tenantId\b/.test(params)) continue;
      const start = fnRegex.lastIndex;
      // Grab a generous slice of the body (until the next export or EOF).
      const rest = src.slice(start);
      const nextExport = rest.indexOf("\nexport ");
      const body = nextExport === -1 ? rest : rest.slice(0, nextExport);
      if (!GUARDS.test(body)) offenders.push(`${file}:${name}`);
    }
    assert.deepEqual(offenders, [], `actions missing a guard call: ${offenders.join(", ")}`);
  }
});
