import { NextResponse, type NextRequest } from "next/server";
import { isElectroEnabled } from "@/lib/electro/auth/session";
import { ensureElectroDemo } from "@/lib/electro/demo-seed";

/**
 * Token-gated demo seeder (brief §79). Guarded by ELECTRO_SEED_TOKEN so it can
 * be triggered once on a fresh deployment without exposing seeding publicly.
 * Never enabled unless both the feature flag and the token are set and match.
 */
export async function POST(req: NextRequest) {
  if (!isElectroEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });
  const token = process.env.ELECTRO_SEED_TOKEN;
  if (!token || req.headers.get("x-electro-seed-token") !== token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await ensureElectroDemo();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
