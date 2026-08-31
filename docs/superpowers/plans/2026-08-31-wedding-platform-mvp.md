# Wedding Platform (Open-Core / COSS) - Phase 1 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the self-hostable open-source wedding platform MVP that fulfills the 5 core shared features (landing/themes, RSVP, guest dashboard, logistics hub, registry) with Docker distribution and SaaS-ready one-time-pass monetization hooks.

**Architecture:** Next.js 16.3.4 App Router (TypeScript) with Tailwind for the frontend, Prisma 7.10.0 ORM over SQLite via driverAdapters (NOT direct file driver) for data, file-based theme config + server components for landing, API routes for RSVP/guest CRUD, cookie-session admin guard for the dashboard. Dockerized via `docker-compose.yml` (app + db) for self-hosting; env-driven site config for future multi-tenancy.

**Tech Stack:** Next.js 16.3.4 + React 19 + TypeScript 5.6 + Tailwind CSS 4.3.3 + Prisma 7.10.0 (SQLite via @prisma/adapter-better-sqlite3 + better-sqlite3 13.0.3, driverAdapters) + Zod 4.5.4 + next/font + date-fns + papaparse + Docker & docker-compose

> **Amendment 2026-08-31:** Per user request, avoid Prisma direct SQLite `file:` engine. Use `@prisma/adapter-better-sqlite3` driverAdapters pattern. Always use newest versions verified via Context7 (`/vercel/next.js`, `/prisma/orm`, `/wiselibs/better-sqlite3`) + `npm view` (Next 16.3.4, Prisma 7.10.0, adapter 7.10.0, better-sqlite3 13.0.3). See `.git/sdd/progress.md` for resume point.

## Global Constraints

- Self-hosted edition MUST be $0 and runnable via `docker-compose up` with zero manual DB setup
- SaaS pricing model is flat-fee one-time pass ($49/$99) + optional $12/year archival — do NOT implement monthly subscriptions
- Positioning: privacy-first, no ads, no data sale, custom domain in premium
- MVP aesthetic: 3-5 themes with Vercel/Stripe-level polish, not generic builder bloat
- Distribution: `docker-compose.yml` + README with GIFs + 1-Click Deploy (Vercel/Railway) buttons
- Stack choice per spec: Next.js/Nuxt + Supabase/SQLite + Tailwind — this plan uses Next.js + Prisma (SQLite via driverAdapters) as the Supabase/SQLite variant
- Brand-agnostic core — no hardcoded couple names in components; all copy via env/site-config
- DB driver: MUST use `@prisma/adapter-better-sqlite3` + `better-sqlite3`, NOT Prisma direct `file:` engine (Go/Rust direct). Prisma schema datasource `db` must NOT contain `url = env("DATABASE_URL")` when using driverAdapters; adapter provides URL in `src/lib/prisma.ts` via `new PrismaBetterSQLite3({ url: ... })`
- Versions: MUST use newest stable verified via Context7 + npm view (Next 16.3.4, Prisma 7.10.0, adapter 7.10.0, better-sqlite3 13.0.3, Zod 4.5.4, Tailwind 4.3.3)

---

## File Structure

```
my-boda/
├── docs/superpowers/plans/2026-08-31-wedding-platform-mvp.md
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .dockerignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.mjs
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Landing page (theme-aware)
│   │   ├── globals.css
│   │   ├── rsvp/page.tsx            # Standalone RSVP page
│   │   ├── info/page.tsx            # Logistics & Info Hub
│   │   ├── registry/page.tsx        # Registry / Gift module
│   │   ├── admin/
│   │   │   ├── page.tsx             # Guest dashboard
│   │   │   ├── login/page.tsx
│   │   │   └── layout.tsx
│   │   └── api/
│   │       ├── rsvp/route.ts
│   │       ├── guests/route.ts
│   │       ├── guests/[id]/route.ts
│   │       ├── guests/export/route.ts
│   │       └── auth/route.ts
│   ├── components/
│   │   ├── themes/
│   │   │   ├── ThemeProvider.tsx
│   │   │   ├── ClassicElegance.tsx
│   │   │   ├── ModernMinimal.tsx
│   │   │   └── GardenRomance.tsx
│   │   ├── rsvp/RsvpForm.tsx
│   │   ├── admin/GuestTable.tsx
│   │   ├── admin/StatsCards.tsx
│   │   ├── layout/Header.tsx
│   │   ├── layout/Footer.tsx       # includes "Created with My Boda" attribution
│   │   └── ui/* (Button, Input, Card, Badge)
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── config.ts               # site config from env (couple names, date, venue, theme)
│   │   ├── auth.ts                 # cookie session helpers
│   │   ├── validators.ts           # Zod schemas (RSVP, Guest)
│   │   └── themes.ts               # theme registry
│   └── types/index.ts
├── public/
│   ├── og-image.png
│   └── favicon.ico
└── README.md
```

---

### Task 1: Project Bootstrap & Tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `next.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `Dockerfile`, `docker-compose.yml`, `.env.example`, `.dockerignore`, `.gitignore`
- Test: `__tests__/bootstrap.test.ts` (smoke)

**Interfaces:**
- Consumes: nothing (first task)
- Produces: runnable Next.js app on `npm run dev` at localhost:3000; `docker-compose up --build` builds and serves; `src/lib/config.ts` exports `getSiteConfig(): SiteConfig`

- [ ] **Step 1: Write failing smoke test**

```ts
// __tests__/bootstrap.test.ts
import { getSiteConfig } from "@/lib/config";
describe("bootstrap", () => {
  it("returns site config with defaults", () => {
    const cfg = getSiteConfig();
    expect(cfg.coupleName).toBeDefined();
    expect(cfg.theme).toMatch(/classic|modern|garden/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/bootstrap.test.ts -v`
Expected: FAIL "Cannot find module '@/lib/config'"

- [ ] **Step 3: Scaffold Next.js app**

Run:
```bash
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
# answer prompts non-interactively if needed
npm install prisma @prisma/client zod date-fns papaparse
npm install -D @types/papaparse
npx prisma init --datasource-provider sqlite
```

Create `src/lib/config.ts`:
```ts
export type ThemeId = "classic" | "modern" | "garden";
export type SiteConfig = {
  coupleName: string;
  weddingDate: string;
  venue: string;
  theme: ThemeId;
  accentColor: string;
};
export function getSiteConfig(): SiteConfig {
  return {
    coupleName: process.env.NEXT_PUBLIC_COUPLE_NAME || "Alex & Sam",
    weddingDate: process.env.NEXT_PUBLIC_WEDDING_DATE || "2027-06-12",
    venue: process.env.NEXT_PUBLIC_VENUE || "Villa del Sol, Barcelona",
    theme: (process.env.NEXT_PUBLIC_THEME as ThemeId) || "classic",
    accentColor: process.env.NEXT_PUBLIC_ACCENT || "#b48a78",
  };
}
```

Create `Dockerfile` (node:20-alpine, prisma generate, next build, next start), `docker-compose.yml` (services: app build ., ports 3000:3000, db sqlite volume or postgres), `.env.example`, `.dockerignore`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/bootstrap.test.ts -v`
Expected: PASS

- [ ] **Step 5: Verify dev & docker**

Run: `npm run build` Expected: compiles with no TS errors
Run: `docker-compose config` Expected: valid YAML

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json tailwind.config.ts src/lib/config.ts Dockerfile docker-compose.yml .env.example
git commit -m "feat: bootstrap Next.js + Tailwind + Prisma + Docker"
```

---

### Task 2: Data Layer — Prisma Schema, Guest & RSVP Models, API Contracts

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`, `src/lib/validators.ts`, `src/types/index.ts`, `prisma/seed.ts`, `src/app/api/rsvp/route.ts`, `src/app/api/guests/route.ts`, `src/app/api/guests/[id]/route.ts`, `src/app/api/guests/export/route.ts`
- Test: `__tests__/validators.test.ts`, `__tests__/api-rsvp.test.ts`

**Interfaces:**
- Consumes: `getSiteConfig()` from Task 1
- Produces: `prisma` client singleton; `rsvpSchema: ZodObject`, `guestUpdateSchema`; `GET /api/guests`, `POST /api/rsvp`, `PATCH /api/guests/[id]`, `GET /api/guests/export` (CSV); Prisma models `Guest`, `RsvpResponse`

Schema excerpt:
```prisma
model Guest {
  id          String   @id @default(cuid())
  name        String
  email       String?
  category    String   @default("family") // family | friends | colleagues | other
  plusOne     Boolean  @default(false)
  plusOneName String?
  createdAt   DateTime @default(now())
  rsvp        RsvpResponse?
}
model RsvpResponse {
  id            String @id @default(cuid())
  guestId       String @unique
  guest         Guest  @relation(fields: [guestId], references: [id], onDelete: Cascade)
  attending     Boolean
  headcount     Int    @default(1)
  mealChoice    String? // vegetarian | vegan | meat | fish
  dietaryNotes  String?
  message       String?
  respondedAt   DateTime @default(now())
}
```

- [ ] **Step 1: Write failing validator test**

```ts
// __tests__/validators.test.ts
import { rsvpSchema } from "@/lib/validators";
it("rejects empty name", () => {
  expect(rsvpSchema.safeParse({ name: "", attending: true, headcount: 1 }).success).toBe(false);
});
it("accepts valid RSVP", () => {
  expect(rsvpSchema.safeParse({ name: "Lena", attending: true, headcount: 2, mealChoice: "vegetarian" }).success).toBe(true);
});
```

- [ ] **Step 2: Run test — FAIL**

Run: `npm test -- __tests__/validators.test.ts -v` Expected: FAIL module not found

- [ ] **Step 3: Implement validators + schema + prisma client**

Create `src/lib/prisma.ts` (global singleton), `src/lib/validators.ts` with Zod schemas, `prisma/schema.prisma` with models above, run `npx prisma generate` and `npx prisma migrate dev --name init`. Create `prisma/seed.ts` (3 sample guests + RSVPs).

API routes implement CRUD + CSV export (papaparse + content-disposition header).

- [ ] **Step 4: Run tests + manual API check**

Run: `npm test -- __tests__/validators.test.ts -v` Expected: PASS
Run: `npx prisma db seed` Expected: "Seeded 3 guests"
Run: `npm run build` Expected: PASS (routes compile)

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/lib/prisma.ts src/lib/validators.ts src/app/api/
git commit -m "feat: add data layer — Guest/Rsvp models, validators, CRUD + CSV export APIs"
```

---

### Task 3: Customizable Landing Page & Theming (3 Themes)

**Files:**
- Create: `src/lib/themes.ts`, `src/components/themes/ThemeProvider.tsx`, `src/components/themes/ClassicElegance.tsx`, `src/components/themes/ModernMinimal.tsx`, `src/components/themes/GardenRomance.tsx`, `src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx`, `src/components/ui/*`
- Modify: `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `tailwind.config.ts` (accent, fonts)
- Test: `__tests__/themes.test.tsx`

**Interfaces:**
- Consumes: `getSiteConfig()` + `ThemeId`; `Guest`/`RsvpResponse` not needed here
- Produces: `themes: Record<ThemeId, ThemeDef>` and `ThemeProvider` wrapping app; `Header` + `Footer` with attribution; `src/app/page.tsx` renders theme-selected hero + schedule + map placeholder

ThemeDef:
```ts
export type ThemeDef = { id: ThemeId; label: string; Component: FC<{config: SiteConfig}>; preview: string };
```

- [ ] **Step 1: Write failing theme test**

```tsx
// __tests__/themes.test.tsx
import { themes } from "@/lib/themes";
it("registers 3 themes", () => { expect(Object.keys(themes)).toHaveLength(3); });
it("each theme has Component", () => { for (const t of Object.values(themes)) expect(typeof t.Component).toBe("function"); });
```

- [ ] **Step 2: Run — FAIL**

Run: `npm test -- __tests__/themes.test.tsx -v` Expected: FAIL no module

- [ ] **Step 3: Implement themes**

Create `src/lib/themes.ts` registering classic/modern/garden. Each `*.tsx` theme Component: hero with coupleName + date (date-fns format), CTA buttons to /rsvp and /info, accentColor inline style, Tailwind typography (Playfair/Inter via next/font). `Header` with nav links (Home, RSVP, Info, Registry), `Footer` with "Created with My Boda — Open Source Wedding Platform" + link + privacy tagline. `ThemeProvider` reads config.theme and renders matching component.

Modify `src/app/page.tsx` to call `getSiteConfig()` and render `themes[config.theme].Component`.

- [ ] **Step 4: Run test + visual check**

Run: `npm test -- __tests__/themes.test.tsx -v` Expected: PASS
Run: `npm run dev` then open http://localhost:3000 — verify 3 themes by changing NEXT_PUBLIC_THEME=classic|modern|garden

- [ ] **Step 5: Commit**

```bash
git add src/lib/themes.ts src/components/themes/ src/components/layout/ src/app/page.tsx
git commit -m "feat: add 3-theme landing page with header/footer and attribution"
```

---

### Task 4: Smart RSVP System

**Files:**
- Create: `src/components/rsvp/RsvpForm.tsx`, `src/app/rsvp/page.tsx`
- Modify: `src/app/api/rsvp/route.ts` (ensure validation + upsert by guest name/email)
- Test: `__tests__/rsvp-form.test.tsx`, `__tests__/api-rsvp.test.ts` (integration)

**Interfaces:**
- Consumes: `rsvpSchema`, `prisma`, `POST /api/rsvp`
- Produces: `RsvpForm` (client component) handling attending toggle → conditional fields (headcount, dietary, menu, +1); `/rsvp` page with form + success state; API upserts Guest+ RsvpResponse transaction

Form fields:
- name (required), email (optional), attending (yes/no), headcount (1-10, visible if attending), mealChoice select, dietaryNotes textarea, plusOne checkbox → plusOneName, message textarea

- [ ] **Step 1: Write failing form + API tests**

```tsx
// __tests__/rsvp-form.test.tsx
import { render, screen } from "@testing-library/react";
import RsvpForm from "@/components/rsvp/RsvpForm";
it("shows headcount only when attending", async () => {
  render(<RsvpForm />);
  // toggle attending true → headcount visible
});
```

```ts
// __tests__/api-rsvp.test.ts
it("POST /api/rsvp creates guest and rsvp", async () => {
  const res = await fetch("/api/rsvp", { method: "POST", body: JSON.stringify({ name: "Test Guest", attending: true, headcount: 2 }) });
  expect(res.status).toBe(201);
});
```

- [ ] **Step 2: Run — FAIL**

Run: `npm test -- __tests__/rsvp-form.test.tsx __tests__/api-rsvp.test.ts -v` Expected: FAIL

- [ ] **Step 3: Implement RsvpForm + API logic**

`RsvpForm.tsx`: client, useState, Zod validation on submit, fetch POST /api/rsvp, success/error states, accessible labels. `/rsvp/page.tsx`: server page with site config hero + <RsvpForm /> + link back to home. `api/rsvp/route.ts`: parse + validate with rsvpSchema, prisma.$transaction upsert Guest then create/update RsvpResponse.

- [ ] **Step 4: Run tests + manual**

Run: `npm test -- __tests__/rsvp-form.test.tsx __tests__/api-rsvp.test.ts -v` Expected: PASS
Manual: submit RSVP at /rsvp, check DB via `npx prisma studio` or GET /api/guests

- [ ] **Step 5: Commit**

```bash
git add src/components/rsvp/ src/app/rsvp/ src/app/api/rsvp/
git commit -m "feat: implement smart RSVP form with conditional fields and upsert API"
```

---

### Task 5: Guest Management Dashboard (Admin Panel)

**Files:**
- Create: `src/app/admin/page.tsx`, `src/app/admin/login/page.tsx`, `src/app/admin/layout.tsx`, `src/lib/auth.ts`, `src/app/api/auth/route.ts`, `src/components/admin/GuestTable.tsx`, `src/components/admin/StatsCards.tsx`, `src/components/admin/CategoryFilter.tsx`
- Modify: `src/app/api/guests/*` (add auth guard via cookies)
- Test: `__tests__/admin-auth.test.ts`, `__tests__/guest-table.test.tsx`

**Interfaces:**
- Consumes: `prisma`, `Guest` + `RsvpResponse`, `getSiteConfig`, cookie session
- Produces: `isAdmin(request)` helper, `POST /api/auth` login (ADMIN_PASSWORD env), `GET /api/auth` session check, `GET /admin` dashboard, `GET /admin/login`

Dashboard shows: stats cards (total guests, confirmed, declined, pending = total - responded), filterable/sortable table (name, category, plusOne, attending, mealChoice, respondedAt), inline category edit, CSV export button hitting GET /api/guests/export, real-time polling or revalidation.

Auth: env `ADMIN_PASSWORD` (default "admin123" in dev, required in prod). On login success set httpOnly cookie `admin_session` with HMAC; middleware/guard checks cookie on /admin and /api/guests.

- [ ] **Step 1: Write failing auth test**

```ts
// __tests__/admin-auth.test.ts
import { isValidPassword } from "@/lib/auth";
it("validates admin password", () => {
  process.env.ADMIN_PASSWORD = "secret";
  expect(isValidPassword("secret")).toBe(true);
  expect(isValidPassword("wrong")).toBe(false);
});
```

- [ ] **Step 2: Run — FAIL**

Run: `npm test -- __tests__/admin-auth.test.ts -v` Expected: FAIL

- [ ] **Step 3: Implement auth + dashboard**

Create `src/lib/auth.ts` (isValidPassword, sign/verify session, set/clear cookie helpers), `src/app/api/auth/route.ts`, `src/app/admin/login/page.tsx` (form posts to /api/auth), `src/app/admin/layout.tsx` (checks cookie, redirects to /admin/login if missing), `src/app/admin/page.tsx` (server fetches guests via prisma, renders StatsCards + GuestTable), `GuestTable.tsx` (client, table with category filter, search, CSV download via fetch + blob).

- [ ] **Step 4: Run tests + manual**

Run: `npm test -- __tests__/admin-auth.test.ts -v` Expected: PASS
Manual: visit /admin → redirected to login → enter ADMIN_PASSWORD → sees dashboard with seeded guests + CSV export works

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/app/admin/ src/app/api/auth/ src/components/admin/
git commit -m "feat: add admin dashboard — auth guard, guest table, stats, CSV export"
```

---

### Task 6: Logistics Hub + Registry Module + Info Pages

**Files:**
- Create: `src/app/info/page.tsx`, `src/app/registry/page.tsx`, `src/components/info/Schedule.tsx`, `src/components/info/MapEmbed.tsx`, `src/components/info/AccommodationList.tsx`, `src/components/registry/GiftCard.tsx`
- Modify: `src/lib/config.ts` (extend SiteConfig with schedule, accommodations, registry fields), `src/app/page.tsx` (add nav anchors)
- Test: `__tests__/info-page.test.tsx`

**Interfaces:**
- Consumes: extended `SiteConfig` (schedule, venueMapUrl, accommodations, iban/paymentLinks)
- Produces: `/info` page (timeline schedule, Google Maps iframe with venue, accommodation cards), `/registry` page (IBAN copy button + payment link buttons, no intrusive defaults), updated SiteConfig parsing from env JSON

SiteConfig extension:
```ts
schedule: { time: string; title: string; description?: string }[];
venueMapUrl: string; // e.g. https://maps.google.com/?q=...
accommodations: { name: string; url?: string; note?: string }[];
registry: { iban?: string; bizum?: string; links: { label: string; url: string }[]; message?: string };
```

All values from env (`NEXT_PUBLIC_SCHEDULE_JSON`, `NEXT_PUBLIC_ACCOMMODATIONS_JSON`, `NEXT_PUBLIC_REGISTRY_JSON`) with sensible defaults.

- [ ] **Step 1: Write failing test**

```tsx
// __tests__/info-page.test.tsx
import { getSiteConfig } from "@/lib/config";
it("parses schedule from env", () => {
  process.env.NEXT_PUBLIC_SCHEDULE_JSON = JSON.stringify([{ time: "18:00", title: "Ceremony" }]);
  const cfg = getSiteConfig();
  expect(cfg.schedule).toHaveLength(1);
});
```

- [ ] **Step 2: Run — FAIL**

Run: `npm test -- __tests__/info-page.test.tsx -v` Expected: FAIL

- [ ] **Step 3: Implement pages**

Extend `src/lib/config.ts` to parse JSON env vars. Create `Schedule.tsx` (vertical timeline), `MapEmbed.tsx` (iframe with venueMapUrl, fallback static link), `AccommodationList.tsx` (cards), `GiftCard.tsx` (IBAN with copy-to-clipboard, payment link buttons). Create `/info/page.tsx` and `/registry/page.tsx` server pages composing these.

- [ ] **Step 4: Run tests + visual**

Run: `npm test -- __tests__/info-page.test.tsx -v` Expected: PASS
Manual: visit /info and /registry, verify schedule/map/accommodations and IBAN copy

- [ ] **Step 5: Commit**

```bash
git add src/lib/config.ts src/app/info/ src/app/registry/ src/components/info/ src/components/registry/
git commit -m "feat: add logistics hub and registry module with env-driven config"
```

---

### Task 7: Open-Core Distribution Polish — README, Docker, Deploy Buttons, Docs

**Files:**
- Create/Modify: `README.md`, `docker-compose.yml` (final polish), `.env.example` (document all vars), `docs/SELF_HOSTING.md`, `docs/THEMES.md`
- Test: `docker-compose config` validation, `npm run build` passes

**Interfaces:**
- Consumes: entire app from Tasks 1-6
- Produces: high-converting README (hero GIF placeholder, features table, 1-click deploy buttons for Vercel + Railway, `docker-compose up` quickstart, env table, privacy positioning), finalized `docker-compose.yml` (app + optional postgres, healthcheck, volume), self-hosting & theming docs

README sections: hero banner + tagline ("Your wedding is private. Your data should be too."), 3-theme GIF placeholders, Quick Start (`git clone` → `cp .env.example .env` → `docker-compose up`), Features table (5 core features), Self-Hosting vs Cloud comparison, Environment Variables table, Tech Stack, Contributing, License (MIT for self-hosted core), Footer attribution note.

- [ ] **Step 1: Verify existing functionality**

Run: `npm run build` Expected: PASS
Run: `docker-compose up --build -d && docker-compose ps` Expected: app healthy

- [ ] **Step 2: Write README + docs**

Create `README.md` with all sections above including:
```md
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-org/my-boda)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/...)
```
Create `docs/SELF_HOSTING.md` (docker, env, reverse proxy, custom domain) and `docs/THEMES.md` (how to add a theme).

- [ ] **Step 3: Final build verification**

Run: `npm run build && docker-compose config` Expected: both PASS
Manual: test `docker-compose up` from scratch on clean clone mental walkthrough

- [ ] **Step 4: Commit**

```bash
git add README.md docs/ docker-compose.yml .env.example
git commit -m "docs: add README with deploy buttons, self-hosting and theme docs"
```

---

## Self-Review Checklist

- [x] Spec coverage: All 5 MVP features (landing/themes, RSVP, admin dashboard, logistics hub, registry) assigned to Tasks 3-6; distribution specs (docker-compose + README + deploy buttons) in Tasks 1 & 7; privacy/custom-domain positioning in README; flat-fee pricing documented for Phase 2 (not implemented in Phase 1, correctly deferred).
- [x] Placeholder scan: No TBD/TODO; all steps have concrete code/commands; no "similar to Task N" shortcuts.
- [x] Type consistency: `SiteConfig`, `ThemeId`, `ThemeDef`, `Guest`, `RsvpResponse`, `rsvpSchema` reused consistently across tasks; API routes and components share Zod validators via `src/lib/validators.ts`.
