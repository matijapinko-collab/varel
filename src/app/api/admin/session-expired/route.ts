import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/security";

/**
 * Records an inactivity logout in the audit log. Called (best-effort, via
 * sendBeacon) by the client inactivity tracker just before signing out, while
 * the session cookie is still valid.
 */
export async function POST() {
  const session = await auth();
  if (session?.user?.id) {
    await audit({
      userId: session.user.id,
      action: "LOGOUT",
      entityType: "SESSION",
      details: { reason: "inactivity_timeout" },
    });
  }
  return new NextResponse(null, { status: 204 });
}
