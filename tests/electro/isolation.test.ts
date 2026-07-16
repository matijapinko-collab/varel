import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const actionsDir = join(dirname(fileURLToPath(import.meta.url)), "../../src/server/actions");

/**
 * Structural guard for Varel Electric (brief §3, §78): every electro server
 * action must route through an authorization guard before touching the
 * database, and no action may trust a client-supplied companyId. This catches
 * the highest-impact multi-tenant bug class — an action that forgets to scope
 * by tenant — without needing a live database.
 */
const GUARDS =
  /require(ElectroContext|ElectroContextAnyStatus|ElectroAdmin|ElectroSuperadmin|Project)|getElectro(Context|Superadmin)|loadAccessibleProject|findLiveInvite|isElectroEnabled/;

// Auth/registration actions establish the session or run pre-auth by design;
// they are exempt from the guard requirement but still flag-gated.
const EXEMPT = new Set<string>([]);

function electroActionFiles(): string[] {
  return readdirSync(actionsDir)
    .filter((f) => f.startsWith("electro-") && f.endsWith(".ts") && !f.includes(" 2."))
    .filter((f) => !EXEMPT.has(f));
}

test("there are electro action files to check", () => {
  assert.ok(electroActionFiles().length >= 3);
});

test("every electro action file imports an authorization guard or flag gate", () => {
  for (const file of electroActionFiles()) {
    const src = readFileSync(join(actionsDir, file), "utf8");
    assert.ok(GUARDS.test(src), `${file} must use an authorization guard`);
  }
});

test("every exported electro action calls a guard or flag gate in its body", () => {
  for (const file of electroActionFiles()) {
    const src = readFileSync(join(actionsDir, file), "utf8");
    const fnRegex = /export async function (\w+)\s*\(([^)]*)\)\s*(?::[^{]+)?\{/g;
    let m: RegExpExecArray | null;
    const offenders: string[] = [];
    while ((m = fnRegex.exec(src))) {
      const [, name] = m;
      const start = fnRegex.lastIndex;
      const rest = src.slice(start);
      const nextExport = rest.indexOf("\nexport ");
      const body = nextExport === -1 ? rest : rest.slice(0, nextExport);
      if (!GUARDS.test(body)) offenders.push(`${file}:${name}`);
    }
    assert.deepEqual(offenders, [], `actions missing a guard call: ${offenders.join(", ")}`);
  }
});

test("no electro action reads companyId straight from FormData into a query", () => {
  // Company-user actions must derive companyId from the authenticated context.
  // Superadmin actions may receive companyId from the form because the caller
  // is a verified global superadmin.
  for (const file of electroActionFiles()) {
    // Superadmin actions are the only ones that legitimately take a companyId
    // from the form, because the caller is a verified global superadmin.
    if (file === "electro-superadmin.ts") continue;
    const src = readFileSync(join(actionsDir, file), "utf8");
    assert.ok(
      !/f\(form,\s*["']companyId["']\)|form\.get\(["']companyId["']\)/.test(src),
      `${file} must not trust a client-supplied companyId`
    );
  }
});
