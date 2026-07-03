import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getLanguage } from "@/lib/content";
import { isLocale } from "@/lib/i18n/config";

const schema = z.object({
  email: z.string().email().max(254),
  locale: z.string().optional(),
  source: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const { email, locale, source } = parsed.data;
  const language =
    locale && isLocale(locale) ? await getLanguage(locale) : null;

  await db.newsletterSubscriber.upsert({
    where: { email: email.toLowerCase() },
    create: {
      email: email.toLowerCase(),
      languageId: language?.id,
      source: source ?? "site",
      status: "ACTIVE",
      confirmedAt: new Date(),
    },
    update: {},
  });

  await db.analyticsEvent.create({
    data: {
      type: "NEWSLETTER_SIGNUP",
      languageCode: locale,
      metadataJson: { source: source ?? "site" },
    },
  });

  return NextResponse.json({ ok: true });
}
