import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
  datasource: {
    // Canonical defaults: host `file:./data/dev.db`, Docker `file:/app/data/dev.db`
    // (see .env.example, src/lib/config.ts, docker-compose.yml, README.md)
    url: env("DATABASE_URL"),
  },
});
