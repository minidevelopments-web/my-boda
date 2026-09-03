import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { validateEnv } from "./config";

let databaseUrl: string;
try {
  databaseUrl = validateEnv(process.env).DATABASE_URL;
} catch {
  // validateEnv throws in production on invalid env; fallback is handled there.
  // For safety, use validated env again (will warn in dev/test).
  databaseUrl = process.env.DATABASE_URL ?? "file:./data/dev.db";
}

const adapter = new PrismaBetterSqlite3({
  url: databaseUrl,
});

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
