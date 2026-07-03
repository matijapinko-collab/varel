import { auth } from "@/lib/auth";
import { roleCan } from "@/lib/permissions";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !roleCan(session.user.role, "analytics.view")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const subscribers = await db.newsletterSubscriber.findMany({
    include: { language: true },
    orderBy: { createdAt: "asc" },
  });

  const header = "email,language,source,status,confirmed_at,created_at";
  const rows = subscribers.map((s) =>
    [
      s.email,
      s.language?.code ?? "",
      s.source ?? "",
      s.status,
      s.confirmedAt?.toISOString() ?? "",
      s.createdAt.toISOString(),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );

  return new Response([header, ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="varel-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
