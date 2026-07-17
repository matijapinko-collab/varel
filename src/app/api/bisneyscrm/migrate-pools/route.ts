import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

/**
 * One-shot, token-gated production migration for Faza 6 (saved views, talent
 * pools + members, candidate `tags` array). Additive only — new tables, new
 * indexes, one nullable/defaulted column on bisneys_candidates. All bisneys_*.
 *
 *   curl -X POST ".../api/bisneyscrm/migrate-pools" -H "x-bootstrap-token: $BISNEYS_BOOTSTRAP_TOKEN"
 */
const DELTA_B64 = "LS0gQWx0ZXJUYWJsZQpBTFRFUiBUQUJMRSAiYmlzbmV5c19jYW5kaWRhdGVzIiBBREQgQ09MVU1OICAgICAidGFncyIgVEVYVFtdIERFRkFVTFQgQVJSQVlbXTo6VEVYVFtdOwoKLS0gQ3JlYXRlVGFibGUKQ1JFQVRFIFRBQkxFICJiaXNuZXlzX3NhdmVkX3ZpZXdzIiAoCiAgICAiaWQiIFRFWFQgTk9UIE5VTEwsCiAgICAibmFtZSIgVEVYVCBOT1QgTlVMTCwKICAgICJlbnRpdHlUeXBlIiBURVhUIE5PVCBOVUxMIERFRkFVTFQgJ0NBTkRJREFURScsCiAgICAidXNlcklkIiBURVhUIE5PVCBOVUxMLAogICAgImZpbHRlcnMiIEpTT05CIE5PVCBOVUxMLAogICAgImlzU2hhcmVkIiBCT09MRUFOIE5PVCBOVUxMIERFRkFVTFQgZmFsc2UsCiAgICAiY3JlYXRlZEF0IiBUSU1FU1RBTVAoMykgTk9UIE5VTEwgREVGQVVMVCBDVVJSRU5UX1RJTUVTVEFNUCwKICAgICJ1cGRhdGVkQXQiIFRJTUVTVEFNUCgzKSBOT1QgTlVMTCwKCiAgICBDT05TVFJBSU5UICJiaXNuZXlzX3NhdmVkX3ZpZXdzX3BrZXkiIFBSSU1BUlkgS0VZICgiaWQiKQopOwoKLS0gQ3JlYXRlVGFibGUKQ1JFQVRFIFRBQkxFICJiaXNuZXlzX3RhbGVudF9wb29scyIgKAogICAgImlkIiBURVhUIE5PVCBOVUxMLAogICAgIm5hbWUiIFRFWFQgTk9UIE5VTEwsCiAgICAiZGVzY3JpcHRpb24iIFRFWFQsCiAgICAiY29sb3IiIFRFWFQsCiAgICAib3duZXJVc2VySWQiIFRFWFQsCiAgICAiY3JlYXRlZEF0IiBUSU1FU1RBTVAoMykgTk9UIE5VTEwgREVGQVVMVCBDVVJSRU5UX1RJTUVTVEFNUCwKICAgICJ1cGRhdGVkQXQiIFRJTUVTVEFNUCgzKSBOT1QgTlVMTCwKCiAgICBDT05TVFJBSU5UICJiaXNuZXlzX3RhbGVudF9wb29sc19wa2V5IiBQUklNQVJZIEtFWSAoImlkIikKKTsKCi0tIENyZWF0ZVRhYmxlCkNSRUFURSBUQUJMRSAiYmlzbmV5c190YWxlbnRfcG9vbF9tZW1iZXJzIiAoCiAgICAiaWQiIFRFWFQgTk9UIE5VTEwsCiAgICAicG9vbElkIiBURVhUIE5PVCBOVUxMLAogICAgImNhbmRpZGF0ZUlkIiBURVhUIE5PVCBOVUxMLAogICAgImFkZGVkQnlVc2VySWQiIFRFWFQsCiAgICAibm90ZSIgVEVYVCwKICAgICJhZGRlZEF0IiBUSU1FU1RBTVAoMykgTk9UIE5VTEwgREVGQVVMVCBDVVJSRU5UX1RJTUVTVEFNUCwKCiAgICBDT05TVFJBSU5UICJiaXNuZXlzX3RhbGVudF9wb29sX21lbWJlcnNfcGtleSIgUFJJTUFSWSBLRVkgKCJpZCIpCik7CgotLSBDcmVhdGVJbmRleApDUkVBVEUgSU5ERVggImJpc25leXNfc2F2ZWRfdmlld3NfdXNlcklkX2lkeCIgT04gImJpc25leXNfc2F2ZWRfdmlld3MiKCJ1c2VySWQiKTsKCi0tIENyZWF0ZUluZGV4CkNSRUFURSBJTkRFWCAiYmlzbmV5c19zYXZlZF92aWV3c19lbnRpdHlUeXBlX2lkeCIgT04gImJpc25leXNfc2F2ZWRfdmlld3MiKCJlbnRpdHlUeXBlIik7CgotLSBDcmVhdGVJbmRleApDUkVBVEUgSU5ERVggImJpc25leXNfdGFsZW50X3Bvb2xzX293bmVyVXNlcklkX2lkeCIgT04gImJpc25leXNfdGFsZW50X3Bvb2xzIigib3duZXJVc2VySWQiKTsKCi0tIENyZWF0ZUluZGV4CkNSRUFURSBJTkRFWCAiYmlzbmV5c190YWxlbnRfcG9vbF9tZW1iZXJzX2NhbmRpZGF0ZUlkX2lkeCIgT04gImJpc25leXNfdGFsZW50X3Bvb2xfbWVtYmVycyIoImNhbmRpZGF0ZUlkIik7CgotLSBDcmVhdGVJbmRleApDUkVBVEUgVU5JUVVFIElOREVYICJiaXNuZXlzX3RhbGVudF9wb29sX21lbWJlcnNfcG9vbElkX2NhbmRpZGF0ZUlkX2tleSIgT04gImJpc25leXNfdGFsZW50X3Bvb2xfbWVtYmVycyIoInBvb2xJZCIsICJjYW5kaWRhdGVJZCIpOwoKLS0gQWRkRm9yZWlnbktleQpBTFRFUiBUQUJMRSAiYmlzbmV5c190YWxlbnRfcG9vbF9tZW1iZXJzIiBBREQgQ09OU1RSQUlOVCAiYmlzbmV5c190YWxlbnRfcG9vbF9tZW1iZXJzX3Bvb2xJZF9ma2V5IiBGT1JFSUdOIEtFWSAoInBvb2xJZCIpIFJFRkVSRU5DRVMgImJpc25leXNfdGFsZW50X3Bvb2xzIigiaWQiKSBPTiBERUxFVEUgQ0FTQ0FERSBPTiBVUERBVEUgQ0FTQ0FERTsKCi0tIEFkZEZvcmVpZ25LZXkKQUxURVIgVEFCTEUgImJpc25leXNfdGFsZW50X3Bvb2xfbWVtYmVycyIgQUREIENPTlNUUkFJTlQgImJpc25leXNfdGFsZW50X3Bvb2xfbWVtYmVyc19jYW5kaWRhdGVJZF9ma2V5IiBGT1JFSUdOIEtFWSAoImNhbmRpZGF0ZUlkIikgUkVGRVJFTkNFUyAiYmlzbmV5c19jYW5kaWRhdGVzIigiaWQiKSBPTiBERUxFVEUgQ0FTQ0FERSBPTiBVUERBVEUgQ0FTQ0FERTsKCg==";

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
