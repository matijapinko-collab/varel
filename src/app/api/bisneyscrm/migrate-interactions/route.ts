import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

/**
 * One-shot, token-gated production migration for Company Intelligence Faza 1
 * (bisneys_interactions table + BisneysInteractionType enum). Additive only,
 * all bisneys_* / Bisneys*. Remove this route after applying.
 *
 *   curl -X POST ".../api/bisneyscrm/migrate-interactions" -H "x-bootstrap-token: $BISNEYS_BOOTSTRAP_TOKEN"
 */
const DELTA_B64 = "LS0gQ3JlYXRlRW51bQpDUkVBVEUgVFlQRSAiQmlzbmV5c0ludGVyYWN0aW9uVHlwZSIgQVMgRU5VTSAoJ1RSRUxMT19DT01NRU5UJywgJ09VVEJPVU5EX0NBTEwnLCAnSU5CT1VORF9DQUxMJywgJ0VNQUlMJywgJ01FRVRJTkdfTk9URScsICdGT0xMT1dfVVAnLCAnUElUQ0gnLCAnQ0xJRU5UX0ZFRURCQUNLJywgJ0RFQUxfTk9URScsICdHRU5FUkFMX05PVEUnKTsKCi0tIENyZWF0ZVRhYmxlCkNSRUFURSBUQUJMRSAiYmlzbmV5c19pbnRlcmFjdGlvbnMiICgKICAgICJpZCIgVEVYVCBOT1QgTlVMTCwKICAgICJjb21wYW55SWQiIFRFWFQsCiAgICAicGVyc29uSWQiIFRFWFQsCiAgICAiY2FuZGlkYXRlSWQiIFRFWFQsCiAgICAiZGVhbElkIiBURVhULAogICAgImpvYklkIiBURVhULAogICAgImFjdG9yVXNlcklkIiBURVhULAogICAgImFjdG9yTmFtZSIgVEVYVCwKICAgICJleHRlcm5hbEFjdG9ySWQiIFRFWFQsCiAgICAidHlwZSIgIkJpc25leXNJbnRlcmFjdGlvblR5cGUiIE5PVCBOVUxMIERFRkFVTFQgJ0dFTkVSQUxfTk9URScsCiAgICAic291cmNlIiAiQmlzbmV5c0FjdGl2aXR5U291cmNlIiBOT1QgTlVMTCBERUZBVUxUICdCSVNORVlTX0NSTScsCiAgICAidGl0bGUiIFRFWFQsCiAgICAicmF3Q29udGVudCIgVEVYVCwKICAgICJwYXJzZWRDb250YWN0TmFtZSIgVEVYVCwKICAgICJwYXJzaW5nQ29uZmlkZW5jZSIgRE9VQkxFIFBSRUNJU0lPTiwKICAgICJuZWVkc1JldmlldyIgQk9PTEVBTiBOT1QgTlVMTCBERUZBVUxUIGZhbHNlLAogICAgImVkaXRlZCIgQk9PTEVBTiBOT1QgTlVMTCBERUZBVUxUIGZhbHNlLAogICAgImV4dGVybmFsSWQiIFRFWFQsCiAgICAiZXh0ZXJuYWxVcmwiIFRFWFQsCiAgICAibWV0YWRhdGEiIEpTT05CLAogICAgIm9jY3VycmVkQXQiIFRJTUVTVEFNUCgzKSBOT1QgTlVMTCBERUZBVUxUIENVUlJFTlRfVElNRVNUQU1QLAogICAgImVkaXRlZEF0IiBUSU1FU1RBTVAoMyksCiAgICAiY3JlYXRlZEF0IiBUSU1FU1RBTVAoMykgTk9UIE5VTEwgREVGQVVMVCBDVVJSRU5UX1RJTUVTVEFNUCwKICAgICJkZWxldGVkQXQiIFRJTUVTVEFNUCgzKSwKCiAgICBDT05TVFJBSU5UICJiaXNuZXlzX2ludGVyYWN0aW9uc19wa2V5IiBQUklNQVJZIEtFWSAoImlkIikKKTsKCi0tIENyZWF0ZUluZGV4CkNSRUFURSBVTklRVUUgSU5ERVggImJpc25leXNfaW50ZXJhY3Rpb25zX2V4dGVybmFsSWRfa2V5IiBPTiAiYmlzbmV5c19pbnRlcmFjdGlvbnMiKCJleHRlcm5hbElkIik7CgotLSBDcmVhdGVJbmRleApDUkVBVEUgSU5ERVggImJpc25leXNfaW50ZXJhY3Rpb25zX2NvbXBhbnlJZF9pZHgiIE9OICJiaXNuZXlzX2ludGVyYWN0aW9ucyIoImNvbXBhbnlJZCIpOwoKLS0gQ3JlYXRlSW5kZXgKQ1JFQVRFIElOREVYICJiaXNuZXlzX2ludGVyYWN0aW9uc19jYW5kaWRhdGVJZF9pZHgiIE9OICJiaXNuZXlzX2ludGVyYWN0aW9ucyIoImNhbmRpZGF0ZUlkIik7CgotLSBDcmVhdGVJbmRleApDUkVBVEUgSU5ERVggImJpc25leXNfaW50ZXJhY3Rpb25zX3BlcnNvbklkX2lkeCIgT04gImJpc25leXNfaW50ZXJhY3Rpb25zIigicGVyc29uSWQiKTsKCi0tIENyZWF0ZUluZGV4CkNSRUFURSBJTkRFWCAiYmlzbmV5c19pbnRlcmFjdGlvbnNfdHlwZV9pZHgiIE9OICJiaXNuZXlzX2ludGVyYWN0aW9ucyIoInR5cGUiKTsKCi0tIENyZWF0ZUluZGV4CkNSRUFURSBJTkRFWCAiYmlzbmV5c19pbnRlcmFjdGlvbnNfb2NjdXJyZWRBdF9pZHgiIE9OICJiaXNuZXlzX2ludGVyYWN0aW9ucyIoIm9jY3VycmVkQXQiKTsKCg==";

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
