import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** Lightweight check used by the public admin bar to confirm an admin viewer. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ admin: false });
  }
  return NextResponse.json({
    admin: true,
    name: session.user.name ?? session.user.username ?? "Admin",
  });
}
