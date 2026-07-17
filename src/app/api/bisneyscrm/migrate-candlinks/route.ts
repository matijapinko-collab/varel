import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

/**
 * One-shot, token-gated production migration for Company Intelligence Faza 5
 * (bisneys_candidate_company_links + BisneysCompanyRelationType enum). Additive,
 * bisneys_* only. Remove this route after applying.
 *
 *   curl -X POST ".../api/bisneyscrm/migrate-candlinks" -H "x-bootstrap-token: $BISNEYS_BOOTSTRAP_TOKEN"
 */
const DELTA_B64 = "LS0gQ3JlYXRlRW51bQpDUkVBVEUgVFlQRSAiQmlzbmV5c0NvbXBhbnlSZWxhdGlvblR5cGUiIEFTIEVOVU0gKCdDVVJSRU5UX0VNUExPWUVFJywgJ0ZPUk1FUl9FTVBMT1lFRScsICdBUFBMSUNBTlQnLCAnU09VUkNFRF9GUk9NX0NPTVBBTlknLCAnUkVGRVJSRURfQllfRU1QTE9ZRUUnLCAnU0VOVF9UT19DTElFTlQnLCAnQ0xJRU5UX0lOVEVSVklFVycsICdPRkZFUkVEJywgJ0hJUkVEJywgJ1JFSkVDVEVEX0JZX0NMSUVOVCcsICdQTEFDRU1FTlQnLCAnUE9URU5USUFMX0NPTlRBQ1QnKTsKCi0tIENyZWF0ZVRhYmxlCkNSRUFURSBUQUJMRSAiYmlzbmV5c19jYW5kaWRhdGVfY29tcGFueV9saW5rcyIgKAogICAgImlkIiBURVhUIE5PVCBOVUxMLAogICAgImNhbmRpZGF0ZUlkIiBURVhUIE5PVCBOVUxMLAogICAgImNvbXBhbnlJZCIgVEVYVCBOT1QgTlVMTCwKICAgICJyZWxhdGlvbiIgIkJpc25leXNDb21wYW55UmVsYXRpb25UeXBlIiBOT1QgTlVMTCwKICAgICJqb2JJZCIgVEVYVCwKICAgICJub3RlIiBURVhULAogICAgImZlZSIgREVDSU1BTCgxMiwyKSwKICAgICJldmVudEF0IiBUSU1FU1RBTVAoMyksCiAgICAiY3JlYXRlZEJ5SWQiIFRFWFQsCiAgICAiY3JlYXRlZEF0IiBUSU1FU1RBTVAoMykgTk9UIE5VTEwgREVGQVVMVCBDVVJSRU5UX1RJTUVTVEFNUCwKICAgICJkZWxldGVkQXQiIFRJTUVTVEFNUCgzKSwKCiAgICBDT05TVFJBSU5UICJiaXNuZXlzX2NhbmRpZGF0ZV9jb21wYW55X2xpbmtzX3BrZXkiIFBSSU1BUlkgS0VZICgiaWQiKQopOwoKLS0gQ3JlYXRlSW5kZXgKQ1JFQVRFIElOREVYICJiaXNuZXlzX2NhbmRpZGF0ZV9jb21wYW55X2xpbmtzX2NvbXBhbnlJZF9pZHgiIE9OICJiaXNuZXlzX2NhbmRpZGF0ZV9jb21wYW55X2xpbmtzIigiY29tcGFueUlkIik7CgotLSBDcmVhdGVJbmRleApDUkVBVEUgSU5ERVggImJpc25leXNfY2FuZGlkYXRlX2NvbXBhbnlfbGlua3NfY2FuZGlkYXRlSWRfaWR4IiBPTiAiYmlzbmV5c19jYW5kaWRhdGVfY29tcGFueV9saW5rcyIoImNhbmRpZGF0ZUlkIik7CgotLSBDcmVhdGVJbmRleApDUkVBVEUgSU5ERVggImJpc25leXNfY2FuZGlkYXRlX2NvbXBhbnlfbGlua3NfcmVsYXRpb25faWR4IiBPTiAiYmlzbmV5c19jYW5kaWRhdGVfY29tcGFueV9saW5rcyIoInJlbGF0aW9uIik7CgotLSBBZGRGb3JlaWduS2V5CkFMVEVSIFRBQkxFICJiaXNuZXlzX2NhbmRpZGF0ZV9jb21wYW55X2xpbmtzIiBBREQgQ09OU1RSQUlOVCAiYmlzbmV5c19jYW5kaWRhdGVfY29tcGFueV9saW5rc19jYW5kaWRhdGVJZF9ma2V5IiBGT1JFSUdOIEtFWSAoImNhbmRpZGF0ZUlkIikgUkVGRVJFTkNFUyAiYmlzbmV5c19jYW5kaWRhdGVzIigiaWQiKSBPTiBERUxFVEUgQ0FTQ0FERSBPTiBVUERBVEUgQ0FTQ0FERTsKCi0tIEFkZEZvcmVpZ25LZXkKQUxURVIgVEFCTEUgImJpc25leXNfY2FuZGlkYXRlX2NvbXBhbnlfbGlua3MiIEFERCBDT05TVFJBSU5UICJiaXNuZXlzX2NhbmRpZGF0ZV9jb21wYW55X2xpbmtzX2NvbXBhbnlJZF9ma2V5IiBGT1JFSUdOIEtFWSAoImNvbXBhbnlJZCIpIFJFRkVSRU5DRVMgImJpc25leXNfY29tcGFuaWVzIigiaWQiKSBPTiBERUxFVEUgQ0FTQ0FERSBPTiBVUERBVEUgQ0FTQ0FERTsKCg==";

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
