import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { validateEnv } from "./config";

let databaseUrl: string;
try {
  databaseUrl = validateEnv(process.env).DATABASE_URL;
} catch {
  databaseUrl = process.env.DATABASE_URL ?? "postgresql://myboda:myboda@localhost:5432/myboda";
}

if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://") && !databaseUrl.startsWith("prisma://")) {
  console.warn(`[prisma] DATABASE_URL does not look like Postgres: ${databaseUrl.slice(0, 12)}...`);
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
