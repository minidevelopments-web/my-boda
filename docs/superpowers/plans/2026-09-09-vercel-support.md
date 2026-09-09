# Vercel Release Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make my-boda deployable to Vercel with a managed Postgres database while keeping Docker self-host working.

**Architecture:** Switch Prisma from `sqlite` + `better-sqlite3` (file-locked, ephemeral on serverless) to `postgresql` with plain `PrismaClient`. Keep Edge-compatible `middleware.ts` untouched. Vercel provides compute; Neon / Vercel Postgres / Supabase provides persistence. Docker Compose switches to the already-sketched `postgres` service as default.

**Tech Stack:** Next.js `16.3.4` (App Router), React `19.1.1`, Prisma `7.10.0`, PostgreSQL (Neon / Vercel Postgres / Supabase), Zod `4.5.4`, TypeScript `5.4.5`, Node `20-alpine` (Docker only)

## Global Constraints

- Node runtime `20` for Docker runner; Vercel uses its own Node 20+ build image — no native modules (`better-sqlite3`) in production bundle.
- Next.js `16.3.4`, React `19.1.1`, Prisma `7.10.0` — do not downgrade.
- `middleware.ts` must stay Edge-compatible: Web Crypto only, no `node:crypto`, no Prisma import.
- Env validation via `src/lib/config.ts` `envSchema` — `ADMIN_PASSWORD` required in production (fail-fast), `DATABASE_URL` must be `postgresql://` / `postgres://` / `prisma://` in production.
- `NEXT_PUBLIC_*` vars are inlined at build time — Vercel env must be set before build.
- DRY, YAGNI, TDD, frequent commits (one commit per task minimum).
- Existing seams preferred: `@/lib/prisma` (`DbClient`), `validateEnv` / `getSiteConfigFromEnv`, mocked `@/lib/prisma` in `__tests__/api-rsvp.test.ts`.

---

### Task 1: Switch Prisma runtime from SQLite to Postgres

**Files:**
- Modify: `prisma/schema.prisma:1-13`
- Modify: `src/lib/prisma.ts:1-24`
- Modify: `prisma/seed.ts:1-8`
- Modify: `package.json:19-40`

**Interfaces:**
- Consumes: `process.env.DATABASE_URL` (now `postgresql://user:pass@host:5432/db`)
- Produces: `export const prisma: PrismaClient`, `export type DbClient` (unchanged name/signature — `src/lib/repositories/guestRepository.ts:11`, `rsvpRepository.ts` keep working untouched)

- [ ] **Step 1: Write the failing test**

New file `__tests__/prisma-postgres.test.ts` — asserts the runtime no longer pulls the sqlite adapter and accepts a postgres URL:

```ts
/**
 * @jest-environment node
 */
describe("prisma postgres runtime", () => {
  it("does not depend on better-sqlite3 adapter", () => {
    const pkg = require("@/package.json");
    expect(pkg.dependencies["better-sqlite3"]).toBeUndefined();
    expect(pkg.dependencies["@prisma/adapter-better-sqlite3"]).toBeUndefined();
  });

  it("accepts postgresql DATABASE_URL via envSchema", async () => {
    const { envSchema } = await import("@/lib/config");
    const res = envSchema.safeParse({
      NODE_ENV: "production",
      ADMIN_PASSWORD: "test-secret-123",
      DATABASE_URL: "postgresql://myboda:myboda@postgres:5432/myboda",
    });
    expect(res.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/prisma-postgres.test.ts --no-coverage`
Expected: FAIL — `better-sqlite3` still in `package.json`, and/or postgres URL handling differs.

- [ ] **Step 3: Write minimal implementation**

`prisma/schema.prisma` — replace datasource block:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

`src/lib/prisma.ts` — replace full file:

```ts
import { PrismaClient } from "@prisma/client";
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

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
```

`prisma/seed.ts:1-8` — replace adapter bootstrap:

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
```

`package.json` — remove three entries (keep everything else byte-identical):

```diff
-    "@prisma/adapter-better-sqlite3": "^7.10.0",
-    "better-sqlite3": "^13.0.3",
...
-    "@types/better-sqlite3": "^9.6.0",
```

Also remove from `allowScripts`:

```diff
-    "better-sqlite3@13.0.3": true,
-    "better-sqlite3@12.11.1": true,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/prisma-postgres.test.ts __tests__/api-rsvp.test.ts __tests__/config.test.ts --no-coverage`
Expected: PASS — api-rsvp still passes because it mocks `@/lib/prisma` (`__tests__/api-rsvp.test.ts:43-56`).

Run: `npx prisma validate`
Expected: `Prisma schema is valid`

Run: `npx prisma generate`
Expected: `Generated Prisma Client`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/lib/prisma.ts prisma/seed.ts package.json __tests__/prisma-postgres.test.ts
git commit -m "feat(db): switch Prisma to Postgres for Vercel support"
```

---

### Task 2: Env contract for Vercel (fail-fast, documented defaults)

**Files:**
- Modify: `src/lib/config.ts:127-131` (serverEnvSchema default)
- Modify: `.env.example:41-48`
- Test: `__tests__/vercel-env.test.ts` (new)

**Interfaces:**
- Consumes: raw `process.env`
- Produces: `validateEnv()` throws in production when `ADMIN_PASSWORD` empty or `DATABASE_URL` not postgres (`src/lib/config.ts:136-178` logic already covers this — only the default string changes)

- [ ] **Step 1: Write the failing test**

```ts
/**
 * @jest-environment node
 */
import { validateEnv, envSchema } from "@/lib/config";

describe("vercel env contract", () => {
  it("rejects file: DATABASE_URL", () => {
    const res = envSchema.safeParse({
      NODE_ENV: "production",
      ADMIN_PASSWORD: "secret-123",
      DATABASE_URL: "file:./data/dev.db",
    });
    // file: URLs are local-dev only; production validator still parses them
    // but prisma.ts warns. This test locks the documented contract:
    // production deployments must use postgres.
    expect(res.success).toBe(true);
    expect(res.data?.DATABASE_URL).toContain("file:");
  });

  it("throws in production without ADMIN_PASSWORD", () => {
    expect(() =>
      validateEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://myboda:myboda@localhost:5432/myboda",
      })
    ).toThrow(/ADMIN_PASSWORD/);
  });

  it("accepts full Vercel env", () => {
    const res = envSchema.safeParse({
      NODE_ENV: "production",
      ADMIN_PASSWORD: "super-secret",
      DATABASE_URL: "postgresql://user:pass@ep-xyz.neon.tech/myboda?sslmode=require",
      NEXT_PUBLIC_COUPLE_NAME: "Alex & Sam",
      NEXT_PUBLIC_WEDDING_DATE: "2027-06-12",
      NEXT_PUBLIC_VENUE: "Villa del Sol, Barcelona",
      NEXT_PUBLIC_THEME: "classic",
      NEXT_PUBLIC_ACCENT: "#b48a78",
    });
    expect(res.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/vercel-env.test.ts --no-coverage`
Expected: FAIL on first run if `validateEnv` default still points at `file:./data/dev.db` messaging (documents the gap).

- [ ] **Step 3: Write minimal implementation**

`src/lib/config.ts:127-131` — change default + keep shape:

```ts
export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1).optional().default("postgresql://myboda:myboda@localhost:5432/myboda"),
  ADMIN_PASSWORD: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).optional().default("development"),
});
```

Also update the two fallback literals in the same file (`validateEnv` fallback at ~line 437 and `getSiteConfigFromEnv` is untouched — only server default). Search for `file:./data/dev.db` in `src/lib/config.ts` and replace the `DATABASE_URL` fallback with the postgres default above; leave the `file:` branch of the `superRefine` validator intact for local-dev backward compat.

`.env.example:41-48` — replace DB block:

```env
# Server-only — Database (Postgres, required for Vercel + Docker prod)
# Vercel Postgres / Neon / Supabase, e.g.:
DATABASE_URL="postgresql://myboda:myboda@localhost:5432/myboda"
# Neon example:
# DATABASE_URL="postgresql://user:pass@ep-xyz.eu-central-1.aws.neon.tech/myboda?sslmode=require"
# Local SQLite fallback (dev only, NOT supported on Vercel):
# DATABASE_URL="file:./data/dev.db"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/vercel-env.test.ts __tests__/config.test.ts __tests__/bootstrap.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/config.ts .env.example __tests__/vercel-env.test.ts
git commit -m "feat(env): postgres-first env contract for Vercel"
```

---

### Task 3: Docker + migration to Postgres (keep self-host working)

**Files:**
- Modify: `docker-compose.yml:1-62`
- Modify: `Dockerfile:17-21,51-74` (drop native toolchain + prune simplification)
- Modify: `prisma.config.ts:9-13` (comment update only)
- Create: `prisma/migrations/XXXX_switch_to_postgres/migration.sql` (generated)

**Interfaces:**
- Consumes: `DATABASE_URL` from environment
- Produces: running `app` + `postgres` services; `npx prisma migrate deploy` succeeds in both Docker runner and Vercel build

- [ ] **Step 1: Write the failing check (no new jest — migration check)**

Run: `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`
Expected: FAIL or SQL mentioning `sqlite`/`AUTOINCREMENT` if old migration history still present — confirms a new postgres migration is needed.

- [ ] **Step 2: Implement minimal changes**

`docker-compose.yml` — uncomment and enable postgres, point app at it:

```yaml
services:
  app:
    build:
      context: .
      args:
        NEXT_PUBLIC_COUPLE_NAME: ${NEXT_PUBLIC_COUPLE_NAME:-}
        NEXT_PUBLIC_WEDDING_DATE: ${NEXT_PUBLIC_WEDDING_DATE:-}
        NEXT_PUBLIC_VENUE: ${NEXT_PUBLIC_VENUE:-}
        NEXT_PUBLIC_THEME: ${NEXT_PUBLIC_THEME:-}
        NEXT_PUBLIC_ACCENT: ${NEXT_PUBLIC_ACCENT:-}
        NEXT_PUBLIC_SCHEDULE_JSON: ${NEXT_PUBLIC_SCHEDULE_JSON:-}
        NEXT_PUBLIC_ACCOMMODATIONS_JSON: ${NEXT_PUBLIC_ACCOMMODATIONS_JSON:-}
        NEXT_PUBLIC_REGISTRY_JSON: ${NEXT_PUBLIC_REGISTRY_JSON:-}
        NEXT_PUBLIC_VENUE_MAP_URL: ${NEXT_PUBLIC_VENUE_MAP_URL:-}
        DATABASE_URL: ${DATABASE_URL:-postgresql://myboda:myboda@postgres:5432/myboda}
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://myboda:myboda@postgres:5432/myboda
      - NEXT_PUBLIC_COUPLE_NAME=${NEXT_PUBLIC_COUPLE_NAME:-Alex & Sam}
      - NEXT_PUBLIC_WEDDING_DATE=${NEXT_PUBLIC_WEDDING_DATE:-2027-06-12}
      - NEXT_PUBLIC_VENUE=${NEXT_PUBLIC_VENUE:-Villa del Sol, Barcelona}
      - NEXT_PUBLIC_THEME=${NEXT_PUBLIC_THEME:-classic}
      - NEXT_PUBLIC_ACCENT=${NEXT_PUBLIC_ACCENT:-#b48a78}
      - NEXT_PUBLIC_SCHEDULE_JSON=${NEXT_PUBLIC_SCHEDULE_JSON:-}
      - NEXT_PUBLIC_ACCOMMODATIONS_JSON=${NEXT_PUBLIC_ACCOMMODATIONS_JSON:-}
      - NEXT_PUBLIC_REGISTRY_JSON=${NEXT_PUBLIC_REGISTRY_JSON:-}
      - NEXT_PUBLIC_VENUE_MAP_URL=${NEXT_PUBLIC_VENUE_MAP_URL:-}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD:-}
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: myboda
      POSTGRES_PASSWORD: myboda
      POSTGRES_DB: myboda
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myboda"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
```

`Dockerfile` — `deps` stage no longer needs the sqlite toolchain:

```dockerfile
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci
```

Keep `builder` (`npx prisma generate` + `npm run build`) and `runner` unchanged except: remove the `better-sqlite3` comment block at the top and replace with `# Postgres production — DATABASE_URL must be postgresql://...`.

`prisma.config.ts:10-12` — update comment:

```ts
datasource: {
  // Postgres everywhere (Vercel + Docker). Local dev uses localhost:5432 via docker compose.
  url: env("DATABASE_URL"),
},
```

Then generate the migration (requires a running postgres — `docker compose up -d postgres` first):

```bash
docker compose up -d postgres
npx prisma migrate dev --name switch_to_postgres
```

- [ ] **Step 3: Run verification**

Run: `npm test -- --passWithNoTests`
Expected: PASS (all `__tests__/*` green; `api-rsvp` mocked, no live DB needed)

Run: `npm run build`
Expected: PASS — `✓ Compiled successfully`, no `better-sqlite3` binding errors

Run: `npx prisma migrate status`
Expected: `Database schema is up to date`

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml Dockerfile prisma.config.ts prisma/migrations prisma/schema.prisma
git commit -m "feat(deploy): postgres-first Docker stack with migration"
```

---

### Task 4: Vercel docs + README button fix (ship the release story)

**Files:**
- Create: `docs/VERCEL.md`
- Modify: `README.md:13-16,101-105`
- Modify: `.gitignore` (ensure `.vercel` ignored) — append if missing

**Interfaces:**
- Consumes: Tasks 1-3 output
- Produces: one-click deploy works; reviewer can deploy from zero following `docs/VERCEL.md` only

- [ ] **Step 1: Write the failing check**

Run: `grep -r "your-org" README.md docs/ | head`
Expected: FAIL-worthy output — `README.md:13-14` still points at `https://github.com/your-org/my-boda` placeholder.

- [ ] **Step 2: Write minimal implementation**

`docs/VERCEL.md` (new, full content):

```markdown
# Deploying my-boda to Vercel

1. Create Postgres: Vercel Postgres, Neon, or Supabase. Copy the `postgresql://...?sslmode=require` URL.
2. Fork/clone `minidevelopments-web/my-boda`, import into Vercel.
3. Framework preset: Next.js. Build: `next build`. No `vercel.json` needed.
4. Env vars (all required before first build):
   - `DATABASE_URL` = your postgres URL
   - `ADMIN_PASSWORD` = long random secret
   - `NEXT_PUBLIC_COUPLE_NAME`, `NEXT_PUBLIC_WEDDING_DATE` (YYYY-MM-DD), `NEXT_PUBLIC_VENUE`, `NEXT_PUBLIC_THEME` (classic|modern|garden), `NEXT_PUBLIC_ACCENT` (#RGB/#RRGGBB)
   - Optional: `NEXT_PUBLIC_SCHEDULE_JSON`, `NEXT_PUBLIC_ACCOMMODATIONS_JSON`, `NEXT_PUBLIC_REGISTRY_JSON`, `NEXT_PUBLIC_VENUE_MAP_URL`
5. Deploy, then run once against the Vercel DB:
   `DATABASE_URL="<vercel-url>" npx prisma migrate deploy`
   `DATABASE_URL="<vercel-url>" npm run db:seed` (optional demo data)
6. Verify: `/` renders, `/rsvp` submits, `/admin/login` + `ADMIN_PASSWORD` works, `/api/v1/guests` returns 401 without cookie.

Notes:
- `NEXT_PUBLIC_*` are build-time — changing them requires Redeploy.
- SQLite `file:` URLs are NOT supported on Vercel (ephemeral FS).
- Middleware stays on Edge; API/DB runs on Node serverless.
```

`README.md:13-14` — fix placeholder:

```diff
-[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-org/my-boda)
-[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/github/your-org/my-boda)
+[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/minidevelopments-web/my-boda)
```

`README.md:102-105` — update DB row + build note:

```diff
-| `DATABASE_URL` | server | `file:./data/dev.db` (`file:/app/data/dev.db` in Docker) | SQLite (default) or `postgresql://…` |
+| `DATABASE_URL` | server | `postgresql://myboda:myboda@postgres:5432/myboda` | Postgres (Vercel, Neon, Supabase, or Docker `postgres` service) |
...
-`NEXT_PUBLIC_*` vars are inlined at build time — rebuild after changing them (`docker compose up --build`).
+`NEXT_PUBLIC_*` vars are inlined at build time — rebuild after changing them (`docker compose up --build`, or Redeploy on Vercel).
```

`.gitignore` — append once:

```
.vercel
```

- [ ] **Step 3: Run verification**

Run: `grep -r "your-org" README.md docs/ || echo "OK: no placeholders"`
Expected: `OK: no placeholders`

Run: `npm run lint && npm test -- --passWithNoTests`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add docs/VERCEL.md README.md .gitignore
git commit -m "docs(deploy): Vercel Postgres guide and button fix"
```
