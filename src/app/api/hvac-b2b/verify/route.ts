import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HVAC_ROUTES } from "@/lib/hvac/content";

export const runtime = "nodejs";

/** Confirms a B2B user's e-mail from the verification link. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  if (!token) return NextResponse.redirect(`${base}${HVAC_ROUTES.login}/prijava`);

  const user = await db.hvacUser.findFirst({ where: { verifyToken: token } }).catch(() => null);
  if (user) {
    await db.hvacUser.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date(), verifyToken: null },
    }).catch(() => {});
  }
  return NextResponse.redirect(`${base}${HVAC_ROUTES.login}/prijava?verified=1`);
}
