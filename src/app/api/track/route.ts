import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requestMeta } from "@/lib/security";

const EVENT_TYPES = [
  "PAGE_VIEW",
  "TOOL_VIEW",
  "SEARCH",
  "LANGUAGE_SWITCH",
  "PROMPT_COPY",
  "COMPARISON_VIEW",
  "CATEGORY_CLICK",
  "OUTBOUND_CLICK",
  "DEAL_CLICK",
] as const;

const schema = z.object({
  type: z.enum(EVENT_TYPES),
  entityType: z.string().max(50).optional(),
  entityId: z.string().max(50).optional(),
  languageCode: z.string().max(5).optional(),
  path: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sessionId: z.string().max(64).optional(),
});

/** Internal analytics collector. Called from the public site (sendBeacon/fetch). */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const meta = await requestMeta();
  const ua = meta.userAgent ?? "";
  const device = /mobile/i.test(ua) ? "mobile" : /tablet|ipad/i.test(ua) ? "tablet" : "desktop";

  try {
    await db.analyticsEvent.create({
      data: {
        type: parsed.data.type,
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
        languageCode: parsed.data.languageCode,
        path: parsed.data.path,
        metadataJson: parsed.data.metadata as object | undefined,
        sessionId: parsed.data.sessionId,
        country: meta.country,
        device,
        referrer: meta.referrer,
      },
    });
    if (parsed.data.type === "SEARCH" && parsed.data.metadata?.query) {
      await db.searchQuery.create({
        data: {
          query: String(parsed.data.metadata.query).slice(0, 255),
          languageCode: parsed.data.languageCode,
          resultCount: Number(parsed.data.metadata.resultCount ?? 0),
          sessionId: parsed.data.sessionId,
        },
      });
    }
  } catch (e) {
    console.error("track failed", e);
  }
  return NextResponse.json({ ok: true });
}
