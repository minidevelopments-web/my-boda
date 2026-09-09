import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
  datasource: {
    // Postgres everywhere (Vercel + Docker). Local dev uses localhost:5432 via docker compose.
    url: env("DATABASE_URL"),
  },
});
