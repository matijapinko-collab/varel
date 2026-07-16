import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { processTrelloAction, boardKindFor } from "@/lib/bisneyscrm/trello/sync";
import type { TrelloActionDto } from "@/lib/bisneyscrm/trello/client";

/**
 * Trello webhook endpoint (brief §17). Public by necessity (Trello calls it),
 * but every action is processed idempotently by action id, so duplicate
 * deliveries are safe. Signature validation runs only when a secret is
 * configured (brief: "validate where possible").
 *
 *   Webhook callback URL: https://varel.io/api/bisneyscrm/trello/webhook
 */

export const dynamic = "force-dynamic";

/** Trello validates a new webhook with a HEAD (some setups GET) request. */
export function HEAD() {
  return new NextResponse(null, { status: 200 });
}
export function GET() {
  return new NextResponse("ok", { status: 200 });
}

function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.BISNEYS_TRELLO_WEBHOOK_SECRET;
  const callbackURL = process.env.BISNEYS_TRELLO_CALLBACK_URL;
  // If no secret/callback configured we cannot verify — accept (idempotency is
  // the real protection). When both are set, the HMAC must match.
  if (!secret || !callbackURL || !signature) return true;
  const digest = crypto.createHmac("sha1", secret).update(body + callbackURL).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-trello-webhook"))) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: { action?: TrelloActionDto };
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("bad request", { status: 400 });
  }

  const action = payload.action;
  if (!action?.id || !action.type) return NextResponse.json({ ok: true, ignored: "no_action" });

  const boardId = (action.data?.board as { id?: string } | undefined)?.id;
  const kind = boardId ? await boardKindFor(boardId) : null;
  // Only process actions from boards we track. Always return 200 so Trello does
  // not disable the webhook.
  if (!kind) return NextResponse.json({ ok: true, ignored: "untracked_board" });

  try {
    const result = await processTrelloAction(action, kind);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("[bisneys trello webhook] failed", (e as Error).message);
    return NextResponse.json({ ok: true, error: "processing_failed" });
  }
}
