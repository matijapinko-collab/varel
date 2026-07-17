import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

/**
 * One-shot, token-gated production migration for Company Intelligence Faza 3
 * (bisneys_companywall_profiles). Additive, bisneys_* only. Remove after applying.
 *
 *   curl -X POST ".../api/bisneyscrm/migrate-companywall" -H "x-bootstrap-token: $BISNEYS_BOOTSTRAP_TOKEN"
 */
const DELTA_B64 = "LS0gQ3JlYXRlVGFibGUKQ1JFQVRFIFRBQkxFICJiaXNuZXlzX2NvbXBhbnl3YWxsX3Byb2ZpbGVzIiAoCiAgICAiaWQiIFRFWFQgTk9UIE5VTEwsCiAgICAiY29tcGFueUlkIiBURVhUIE5PVCBOVUxMLAogICAgImV4dGVybmFsSWQiIFRFWFQsCiAgICAiY291bnRyeSIgVEVYVCwKICAgICJsZWdhbE5hbWUiIFRFWFQsCiAgICAib2liIiBURVhULAogICAgIm1icyIgVEVYVCwKICAgICJzdGF0dXMiIFRFWFQsCiAgICAiZm91bmRlZEF0IiBUSU1FU1RBTVAoMyksCiAgICAibGVnYWxGb3JtIiBURVhULAogICAgInZhdFN0YXR1cyIgVEVYVCwKICAgICJhZGRyZXNzIiBURVhULAogICAgImNpdHkiIFRFWFQsCiAgICAicG9zdGFsQ29kZSIgVEVYVCwKICAgICJua2QiIFRFWFQsCiAgICAiYWN0aXZpdHkiIFRFWFQsCiAgICAiZW1wbG95ZWVDb3VudCIgSU5URUdFUiwKICAgICJyZXZlbnVlIiBERUNJTUFMKDE2LDIpLAogICAgInByb2ZpdCIgREVDSU1BTCgxNiwyKSwKICAgICJjcmVkaXRSYXRpbmciIFRFWFQsCiAgICAiZGlyZWN0b3JzIiBKU09OQiwKICAgICJvd25lcnMiIEpTT05CLAogICAgInJhdyIgSlNPTkIsCiAgICAic291cmNlIiBURVhUIE5PVCBOVUxMIERFRkFVTFQgJ0NPTVBBTllXQUxMJywKICAgICJtYXRjaENvbmZpZGVuY2UiIERFQ0lNQUwoNCwzKSwKICAgICJtYXRjaE1ldGhvZCIgVEVYVCwKICAgICJmZXRjaGVkQXQiIFRJTUVTVEFNUCgzKSwKICAgICJtYXRjaGVkQnlJZCIgVEVYVCwKICAgICJjcmVhdGVkQXQiIFRJTUVTVEFNUCgzKSBOT1QgTlVMTCBERUZBVUxUIENVUlJFTlRfVElNRVNUQU1QLAogICAgInVwZGF0ZWRBdCIgVElNRVNUQU1QKDMpIE5PVCBOVUxMLAoKICAgIENPTlNUUkFJTlQgImJpc25leXNfY29tcGFueXdhbGxfcHJvZmlsZXNfcGtleSIgUFJJTUFSWSBLRVkgKCJpZCIpCik7CgotLSBDcmVhdGVJbmRleApDUkVBVEUgVU5JUVVFIElOREVYICJiaXNuZXlzX2NvbXBhbnl3YWxsX3Byb2ZpbGVzX2NvbXBhbnlJZF9rZXkiIE9OICJiaXNuZXlzX2NvbXBhbnl3YWxsX3Byb2ZpbGVzIigiY29tcGFueUlkIik7CgotLSBDcmVhdGVJbmRleApDUkVBVEUgSU5ERVggImJpc25leXNfY29tcGFueXdhbGxfcHJvZmlsZXNfb2liX2lkeCIgT04gImJpc25leXNfY29tcGFueXdhbGxfcHJvZmlsZXMiKCJvaWIiKTsKCi0tIEFkZEZvcmVpZ25LZXkKQUxURVIgVEFCTEUgImJpc25leXNfY29tcGFueXdhbGxfcHJvZmlsZXMiIEFERCBDT05TVFJBSU5UICJiaXNuZXlzX2NvbXBhbnl3YWxsX3Byb2ZpbGVzX2NvbXBhbnlJZF9ma2V5IiBGT1JFSUdOIEtFWSAoImNvbXBhbnlJZCIpIFJFRkVSRU5DRVMgImJpc25leXNfY29tcGFuaWVzIigiaWQiKSBPTiBERUxFVEUgQ0FTQ0FERSBPTiBVUERBVEUgQ0FTQ0FERTsKCg==";

export async function POST(req: NextRequest) {
  const expected = process.env.BISNEYS_BOOTSTRAP_TOKEN;
  const provided = req.headers.get("x-bootstrap-token") ?? new URL(req.url).searchParams.get("token");
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const sql = Buffer.from(DELTA_B64, "base64").toString("utf8");
    const statements = sql.split(";").map((s) => s.trim()).filter((s) => s.length > 0);
    const applied: string[] = [];
    for (const stmt of statements) {
      try {
        await db.$executeRawUnsafe(stmt);
        applied.push(stmt.slice(0, 60));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/already exists|duplicate/i.test(msg)) { applied.push("SKIP(exists): " + stmt.slice(0, 50)); continue; }
        throw e;
      }
    }
    return NextResponse.json({ ok: true, count: applied.length, applied });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
