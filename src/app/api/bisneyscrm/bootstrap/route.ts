import { NextResponse, type NextRequest } from "next/server";
import { ensureBisneysBootstrap } from "@/lib/bisneyscrm/bootstrap";

/**
 * One-shot, token-gated seeding of the initial CRM users from environment
 * secrets. Used for local setup and for the production migration flow (the
 * prod DATABASE_URL is unreachable from the CLI, and `tsx` seed scripts do not
 * run in this environment). Idempotent — existing users are never recreated.
 *
 *   curl -X POST /api/bisneyscrm/bootstrap -H "x-bootstrap-token: $BISNEYS_BOOTSTRAP_TOKEN"
 */
export async function POST(req: NextRequest) {
  const expected = process.env.BISNEYS_BOOTSTRAP_TOKEN;
  const provided =
    req.headers.get("x-bootstrap-token") ??
    new URL(req.url).searchParams.get("token");

  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const created = await ensureBisneysBootstrap();
    return NextResponse.json({ ok: true, created });
  } catch (e) {
    console.error("[bisneys bootstrap] failed", (e as Error).message);
    return NextResponse.json({ error: "bootstrap_failed" }, { status: 500 });
  }
}
