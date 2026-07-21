import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Single PrismaClient instance reused across hot reloads in development
// and across invocations in serverless (per-lambda) environments.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // One connection per lambda instance. A lambda handles one request at a
    // time, so a bigger pool buys nothing but multiplies open connections by
    // the number of warm instances — which is how we hit the server's
    // connection limit and served 500s across every DB-backed page.
    max: 1,
    // Release the connection quickly once a lambda goes idle, so a warm
    // instance that sees no traffic stops holding a slot.
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

// Reused in production too: a warm lambda that re-evaluates this module must
// not open a second pool.
export const db: PrismaClient = globalForPrisma.prisma ?? createClient();

globalForPrisma.prisma = db;
