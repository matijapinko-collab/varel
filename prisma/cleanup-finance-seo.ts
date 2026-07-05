/**
 * One-off cleanup: remove SeoMetadata rows that referenced the now-deleted
 * finance entity types so the SeoEntityType enum can be narrowed safely.
 * Run BEFORE `prisma db push` when dropping the finance vertical.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const finance = ["FINANCE_PLATFORM", "STOCK_ANALYSIS", "ETF_GUIDE"];
  const res = await db.$executeRawUnsafe(
    `DELETE FROM "seo_metadata" WHERE "entityType"::text = ANY($1::text[])`,
    finance
  );
  console.log(`Deleted ${res} finance SeoMetadata row(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
