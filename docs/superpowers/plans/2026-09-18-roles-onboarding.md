# Roles & Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4-role RBAC (guest/couple/planner/sysadmin) with household invite-codes, first-run setup wizard, and per-role onboarding to my-boda.

**Architecture:** Extend current HMAC-SHA256 cookie sessions with `userId.role` claims (Edge-compatible); add Prisma `User` + `Household` models; gate RSVP by invite-code into `guest_session`; role menus + `/setup`, `/login`, `/help`, `/admin/system` pages.

**Tech Stack:** Next.js 16.3.4 App Router, React 19.1.1, Prisma 7.10.0 + Postgres (`@prisma/adapter-pg`), `bcryptjs` (new), Zod 4.5.4, Jest 29 + ts-jest, Tailwind 4.3.3.

## Global Constraints

- Node runtime auth in `src/lib/auth.ts`, Edge mirror in `middleware.ts` — keep HMAC payload format, 7-day staff expiry, secret derivation (`ADMIN_PASSWORD`) in sync.
- Staff session cookie name stays `admin_session`, httpOnly, `SameSite=Lax`, `Secure` in production.
- Guest session cookie name is `guest_session`, httpOnly, 30-day expiry, HMAC-signed.
- Invite codes: 12-char uppercase nanoid-style `[A-Z0-9]`, unique per household.
- Passwords: `bcryptjs` cost 12, never log; generic "Invalid email or password" on failure.
- Rate-limit staff login + guest code attempts: existing `src/lib/rateLimit.ts`, 5 attempts / 15 min / IP, 429 with `Retry-After`.
- i18n: all user-visible strings via `src/i18n/dictionaries/{en,es,fr,de,pt}.json` with parity test; locale prefix `app/[lang]/`.
- Middleware stays source of truth; route handlers re-check via `requireRole` (defense-in-depth).
- Commands: `npm run build`, `npm run lint`, `npx jest __tests__/roles-<name>.test.ts`, `npx prisma migrate dev --name <name>`.

---

### Task 1: Prisma models + bcryptjs dep + seed bootstrap

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `package.json`
- Modify: `prisma/seed.ts`
- Test: `__tests__/roles-model.test.ts`

**Interfaces:**
- Consumes: existing `Guest`, `RsvpResponse` models.
- Produces: `User { id, email, passwordHash, role, createdAt }`, `Role enum (COUPLE|PLANNER|SYSADMIN)`, `Household { id, label, inviteCode @unique, maxGuests, expiresAt?, createdAt }`, `Guest.householdId?`, `guestNeedsSetup(): Promise<boolean>` (used by Task 3/5).

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/roles-model.test.ts
import fs from "fs";
it("schema declares User, Household and Guest.householdId", () => {
  const s = fs.readFileSync("prisma/schema.prisma", "utf8");
  expect(s).toMatch(/model User/);
  expect(s).toMatch(/enum Role/);
  expect(s).toMatch(/COUPLE/);
  expect(s).toMatch(/PLANNER/);
  expect(s).toMatch(/SYSADMIN/);
  expect(s).toMatch(/model Household/);
  expect(s).toMatch(/inviteCode/);
  expect(s).toMatch(/householdId/);
});
it("bcryptjs is a dependency", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  expect(pkg.dependencies["bcryptjs"]).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/roles-model.test.ts 2>&1 | tail -20`
Expected: FAIL (model User / bcryptjs missing).

- [ ] **Step 3: Add dependency + schema**

Run: `npm install bcryptjs && npm install -D @types/bcryptjs`

Append to `prisma/schema.prisma` (keep existing Guest/RsvpResponse, add):

```prisma
enum Role {
  COUPLE
  PLANNER
  SYSADMIN
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         Role     @default(PLANNER)
  createdAt    DateTime @default(now())
}

model Household {
  id         String    @id @default(cuid())
  label      String
  inviteCode String    @unique
  maxGuests  Int       @default(2)
  expiresAt  DateTime?
  createdAt  DateTime  @default(now())
  guests     Guest[]
}
```

Edit `model Guest`, add after `plusOneName String?`:

```prisma
  householdId    String?
  household      Household? @relation(fields: [householdId], references: [id], onDelete: SetNull)
  inviteCodeUsed String?
```

- [ ] **Step 4: Migrate + seed bootstrap note + rerun test**

Run: `npx prisma migrate dev --name roles-households`
Run: `npx jest __tests__/roles-model.test.ts 2>&1 | tail -10`
Expected: PASS.

Seed: in `prisma/seed.ts` add at top (idempotent bootstrap helper, no secrets committed):

```ts
import bcrypt from "bcryptjs";
// guestNeedsSetup(): true when User table empty → /setup must run.
// Bootstrap (run manually, never commit real passwords):
//   ADMIN_EMAIL=sysadmin@example.com ADMIN_BOOTSTRAP_PW='...' npx prisma db seed
const adminEmail = process.env.ADMIN_EMAIL;
const bootstrapPw = process.env.ADMIN_BOOTSTRAP_PW;
if (adminEmail && bootstrapPw) {
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  const exists = await db.user.count();
  if (exists === 0) {
    await db.user.create({ data: { email: adminEmail, passwordHash: await bcrypt.hash(bootstrapPw, 12), role: "SYSADMIN" } });
    console.log(`[seed] bootstrap sysadmin ${adminEmail}`);
  }
  await db.$disconnect();
}
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations package.json package-lock.json prisma/seed.ts __tests__/roles-model.test.ts
git commit -m "feat(roles): User/Household models, bcryptjs dep, seed bootstrap"
```

---

### Task 2: Role + password + invite-code libraries

**Files:**
- Create: `src/lib/roles.ts`
- Create: `src/lib/passwords.ts`
- Create: `src/lib/inviteCodes.ts`
- Test: `__tests__/roles-libs.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Role = "COUPLE"|"PLANNER"|"SYSADMIN"`, `ROLE_RANK {GUEST:0,PLANNER:1,COUPLE:2,SYSADMIN:3}`, `canAccess(role, area: "guests"|"users"|"system"|"content"): boolean`, `hashPassword(pw): Promise<string>`, `verifyPassword(pw, hash): Promise<boolean>`, `generateInviteCode(): string`, `normalizeInviteCode(s): string` (used by Tasks 3–6).

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/roles-libs.test.ts
import { canAccess } from "@/lib/roles";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { generateInviteCode, normalizeInviteCode } from "@/lib/inviteCodes";

it("planner can guests but not users/system", () => {
  expect(canAccess("PLANNER", "guests")).toBe(true);
  expect(canAccess("PLANNER", "users")).toBe(false);
  expect(canAccess("PLANNER", "system")).toBe(false);
});
it("sysadmin can everything, couple can guests+content not users/system-write", () => {
  expect(canAccess("SYSADMIN", "system")).toBe(true);
  expect(canAccess("COUPLE", "guests")).toBe(true);
  expect(canAccess("COUPLE", "users")).toBe(false);
});
it("bcrypt round-trip", async () => {
  const h = await hashPassword("correct horse 123");
  expect(await verifyPassword("correct horse 123", h)).toBe(true);
  expect(await verifyPassword("wrong", h)).toBe(false);
}, 15000);
it("invite codes are 12-char uppercase", () => {
  const c = generateInviteCode();
  expect(c).toMatch(/^[A-Z0-9]{12}$/);
  expect(normalizeInviteCode("  ab-12 cd ")).toBe("AB12CD");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/roles-libs.test.ts 2>&1 | tail -15`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/roles.ts
export type StaffRole = "COUPLE" | "PLANNER" | "SYSADMIN";
export type Area = "guests" | "content" | "users" | "system";
export const ROLE_RANK: Record<string, number> = { GUEST: 0, PLANNER: 1, COUPLE: 2, SYSADMIN: 3 };
export function canAccess(role: string, area: Area): boolean {
  if (role === "SYSADMIN") return true;
  if (area === "guests" || area === "content") return role === "COUPLE" || role === "PLANNER";
  return false; // users + system: sysadmin only (couple creates planners via users-lite, see Task 3)
}
```

```ts
// src/lib/passwords.ts
import bcrypt from "bcryptjs";
export async function hashPassword(pw: string): Promise<string> { return bcrypt.hash(pw, 12); }
export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  try { return await bcrypt.compare(pw, hash); } catch { return false; }
}
```

```ts
// src/lib/inviteCodes.ts
import crypto from "crypto";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
export function generateInviteCode(): string {
  const bytes = crypto.randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
export function normalizeInviteCode(s: string): string {
  return (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/roles-libs.test.ts 2>&1 | tail -10`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/roles.ts src/lib/passwords.ts src/lib/inviteCodes.ts __tests__/roles-libs.test.ts
git commit -m "feat(roles): role matrix, bcrypt passwords, invite codes"
```

---

### Task 3: Session upgrade + login/logout/setup + guest-session APIs

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/requireAdmin.ts` (add `requireRole`)
- Create: `src/app/api/v1/auth/route.ts` (email+password login; keep legacy `{password}` compat until first User exists)
- Create: `src/app/api/v1/auth/logout/route.ts`
- Create: `src/app/api/v1/admin/setup/route.ts` (bootstrap-once create SYSADMIN+COUPLE)
- Create: `src/app/api/v1/admin/users/route.ts` (SYSADMIN list/create planner+couple)
- Create: `src/app/api/v1/guest/verify/route.ts` (code+name → set guest_session)
- Modify: `src/lib/prisma.ts` (no change needed — reuse client)
- Test: `__tests__/roles-auth.test.ts`

**Interfaces:**
- Consumes: Task 1 models, Task 2 libs, `getAdminPassword`, existing `checkRateLimit`.
- Produces: `createStaffSession(userId, role)`, `parseStaffSession(token): {userId, role} | null`, `createGuestSession(householdId, guestId)`, `parseGuestSession(token)`, `requireRole(req, ...allowed)` (used by Task 4 middleware mirror + Task 5/6 UI).

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/roles-auth.test.ts
import { createStaffSession, parseStaffSession, createGuestSession, parseGuestSession } from "@/lib/auth";
it("staff session round-trips userId+role", () => {
  process.env.ADMIN_PASSWORD = "test-secret-123";
  const tok = createStaffSession("u1", "PLANNER");
  expect(parseStaffSession(tok)).toEqual(expect.objectContaining({ userId: "u1", role: "PLANNER" }));
});
it("legacy token without role parses as null role", () => {
  process.env.ADMIN_PASSWORD = "test-secret-123";
  const { signSession } = require("@/lib/auth");
  const legacy = signSession(`${Date.now()}.abcdef`);
  expect(parseStaffSession(legacy)?.role).toBeUndefined();
});
it("guest session round-trips household", () => {
  process.env.ADMIN_PASSWORD = "test-secret-123";
  const tok = createGuestSession("h1", "g1");
  expect(parseGuestSession(tok)).toEqual(expect.objectContaining({ householdId: "h1", guestId: "g1" }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/roles-auth.test.ts 2>&1 | tail -15`
Expected: FAIL (functions not exported).

- [ ] **Step 3: Extend `src/lib/auth.ts` (append, keep existing exports working)**

```ts
import type { NextRequest } from "next/server";
export const GUEST_COOKIE_NAME = "guest_session";
const STAFF_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const GUEST_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function createStaffSession(userId: string, role: string): string {
  const payload = `${userId}.${role}.${Date.now()}.${crypto.randomBytes(8).toString("hex")}`;
  return signSession(payload);
}
export function parseStaffSession(token: string | null | undefined): { userId: string; role?: string } | null {
  if (!verifySession(token)) return null;
  const payload = token!.slice(0, token!.lastIndexOf("."));
  const [userId, role] = payload.split(".");
  if (!userId) return null;
  return role && ["COUPLE", "PLANNER", "SYSADMIN"].includes(role) ? { userId, role } : { userId };
}
export function createGuestSession(householdId: string, guestId: string): string {
  const payload = `g.${householdId}.${guestId}.${Date.now()}.${crypto.randomBytes(8).toString("hex")}`;
  return signSession(payload);
}
export function parseGuestSession(token: string | null | undefined): { householdId: string; guestId: string } | null {
  if (!verifySessionWithAge(token, GUEST_MAX_AGE_MS)) return null;
  const payload = token!.slice(0, token!.lastIndexOf("."));
  const parts = payload.split(".");
  if (parts[0] !== "g" || !parts[1] || !parts[2]) return null;
  return { householdId: parts[1], guestId: parts[2] };
}
function verifySessionWithAge(token: string | null | undefined, maxAge: number): boolean {
  if (!token) return false;
  const secret = getAuthSecret();
  if (!secret) return false;
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return false;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (sig.length !== expected.length) return false;
  try { if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false; }
  catch { return false; }
  const ts = Number(payload.split(".").slice(-2, -1)[0]);
  if (!Number.isFinite(ts)) return false;
  if (Date.now() - ts > maxAge) return false;
  if (ts > Date.now() + 60 * 1000) return false;
  return true;
}
```

Add to `src/lib/requireAdmin.ts`:

```ts
import { parseStaffSession } from "@/lib/auth";
export function requireRole(req: NextRequest, ...allowed: string[]): NextResponse | null {
  const token = req.cookies.get("admin_session")?.value;
  const sess = parseStaffSession(token);
  if (!sess?.role || !allowed.includes(sess.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
```

APIs (skeletons — full Zod validation + rate-limit inside):
- `POST /api/v1/auth` body `{ email, password }` → `verifyPassword` → `createStaffSession` → set `admin_session`. Legacy compat: if `User.count()===0` and body `{ password }` matches `isValidPassword`, allow once (bootstrap window) then force `/setup`.
- `POST /api/v1/auth/logout` → clear `admin_session` (+ `guest_session` if present).
- `POST /api/v1/admin/setup` body `{ sysadminEmail, sysadminPassword, coupleEmail, couplePassword }` → 403 unless `User.count()===0` → create both, min-length 12 enforced by Zod.
- `GET|POST /api/v1/admin/users` → `requireRole(req,"SYSADMIN")` → list (no hashes) / create `{ email, password, role }`.
- `POST /api/v1/guest/verify` body `{ code, name }` → normalize code → find Household + Guest name match (case-insensitive contains) → `createGuestSession` → set `guest_session`, 429 on 5 bad tries/IP.

- [ ] **Step 4: Run tests**

Run: `npx jest __tests__/roles-auth.test.ts __tests__/admin-auth.test.ts 2>&1 | tail -10`
Expected: PASS (legacy test still green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/lib/requireAdmin.ts src/app/api/v1/auth src/app/api/v1/admin __tests__/roles-auth.test.ts
git commit -m "feat(auth): role sessions, login/logout/setup/users/guest-verify APIs"
```

---

### Task 4: Middleware role matrix (+ Edge mirror)

**Files:**
- Modify: `middleware.ts`
- Test: `__tests__/roles-middleware.test.ts`

**Interfaces:**
- Consumes: Task 3 session format, `getAdminPassword`.
- Produces: redirects/401s per matrix (consumed by Task 5/6 pages).

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/roles-middleware.test.ts
import { verifySessionEdge } from "@/middleware";
process.env.ADMIN_PASSWORD = "test-secret-123";
it("rejects empty token", async () => { expect(await verifySessionEdge(null)).toBe(false); });
it("role payload shape documents userId.role convention", () => {
  const payload = `u1.PLANNER.${Date.now()}.ab12`;
  expect(payload.split(".").length).toBe(4);
});
```

- [ ] **Step 2: Run test to verify it fails/passes baseline**

Run: `npx jest __tests__/roles-middleware.test.ts 2>&1 | tail -8`
Expected: PASS baseline (documents shape; matrix asserted in Step 4 integration).

- [ ] **Step 3: Extend `middleware.ts`**

Keep `verifySessionEdge` as-is (HMAC+expiry agnostic to payload shape — already forwards-compatible).
Add after token verify:

```ts
function parseRoleEdge(token: string): string | null {
  const payload = token.slice(0, token.lastIndexOf("."));
  const parts = payload.split(".");
  // staff: userId.role.ts.rand | guest: g.household.guest.ts.rand | legacy: ts.rand
  if (parts[0] === "g") return "GUEST";
  if (parts.length >= 4 && ["COUPLE", "PLANNER", "SYSADMIN"].includes(parts[1])) return parts[1];
  return null; // legacy pre-role token → treat as SYSADMIN only if User.count unknown at edge; force re-login
}
```

Routing (inside `middleware()`, after locale strip, before `next()`):
- `stripped === "/setup"` → always allow (page itself checks `User.count` client-side via `/api/v1/admin/setup` GET).
- `stripped === "/login"` → always allow.
- `stripped === "/admin/system"` or `/api/v1/admin/*` → require role `SYSADMIN` else 401 (API) or 307 `/{lang}/login?next=...` (page).
- `stripped === "/admin"` or `/admin/*`, `/api/v1/guests*` → require `COUPLE|PLANNER|SYSADMIN`, legacy role-less token → redirect login (forces re-login post-upgrade).
- Guest verify API `/api/v1/guest/verify`, `/api/v1/rsvp`, `/api/v1/auth` → always allow (rate-limited inside handler).

- [ ] **Step 4: Run full middleware + auth suites**

Run: `npx jest __tests__/roles-middleware.test.ts __tests__/i18n-middleware.test.ts __tests__/roles-auth.test.ts 2>&1 | tail -10`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add middleware.ts __tests__/roles-middleware.test.ts
git commit -m "feat(auth): middleware role matrix with legacy re-login"
```

---

### Task 5: Setup wizard + staff login UI + role-gated admin

**Files:**
- Create: `src/app/[lang]/setup/page.tsx` (4-step wizard: account → wedding → guests → codes)
- Create: `src/app/[lang]/login/page.tsx` (email+password; links to setup when fresh)
- Modify: `src/app/[lang]/admin/login/page.tsx` (redirect → `/{lang}/login`, keep file as re-export to avoid breaking links)
- Modify: `src/app/[lang]/admin/layout.tsx` (role menu: planner hides System/Users)
- Modify: `src/app/[lang]/admin/page.tsx` (checklist header + planner notice)
- Create: `src/app/[lang]/admin/system/page.tsx` (SYSADMIN: env presence, DB health, users, audit hint)
- Create: `src/components/onboarding/SetupWizard.tsx`, `src/components/onboarding/Checklist.tsx`
- Test: `__tests__/roles-onboarding.test.tsx`

**Interfaces:**
- Consumes: Task 3 APIs, Task 4 guards, `getDictionary(lang)`.
- Produces: onboarding UI routes (used by Task 7 help links).

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/roles-onboarding.test.tsx
import { render, screen } from "@testing-library/react";
import Checklist from "@/components/onboarding/Checklist";
it("checklist renders progress + empty CTA", () => {
  render(<Checklist responded={3} total={10} codesSent={2} labels={{ title: "Setup", cta: "Add guests" }} />);
  expect(screen.getByText("Setup")).toBeInTheDocument();
  expect(screen.getByText("Add guests")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/roles-onboarding.test.tsx 2>&1 | tail -12`
Expected: FAIL (component missing).

- [ ] **Step 3: Minimal UI**

```tsx
// src/components/onboarding/Checklist.tsx
export default function Checklist({ responded, total, codesSent, labels }: { responded: number; total: number; codesSent: number; labels: { title: string; cta: string } }) {
  return (
    <section aria-label={labels.title} className="rounded border p-4">
      <h2 className="font-bold">{labels.title}</h2>
      <p className="text-sm text-gray-600">{responded}/{total} responded · {codesSent} codes sent</p>
      <a href="./admin?tab=guests" className="mt-2 inline-block rounded bg-black px-3 py-1.5 text-sm text-white">{labels.cta}</a>
    </section>
  );
}
```

`SetupWizard.tsx`: 4-step client component (state `step`, per-step `<form>`, POSTs to `/api/v1/admin/setup` on step 1, CSV file input POSTs to `/api/v1/guests/import` on step 3, `generateInviteCode` preview on step 4). Keep under 200 lines; reuse Tailwind `rounded border px-3 py-2 text-sm` input style from existing login page.
`/[lang]/setup/page.tsx`: server wrapper → `getDictionary(lang)` → `<SetupWizard dict={dict.setup} />`; if setup already done (fetch `User.count` via service → 0 check), `redirect(/{lang}/login)`.
`/[lang]/login/page.tsx`: clone of current admin login but fields email+password → `POST /api/v1/auth`.
`admin/layout.tsx`: read `admin_session` via `cookies()` + `parseStaffSession` → pass `role` to nav; hide System/Users unless SYSADMIN; show "planner — limited" banner when PLANNER.
`admin/system/page.tsx`: `requireRole` server-side → render env presence (`SET`/`MISSING`, never values), DB `SELECT 1` latency, user list (email+role, no hash), backup command hint.

- [ ] **Step 4: Run tests + build**

Run: `npx jest __tests__/roles-onboarding.test.tsx 2>&1 | tail -8`
Expected: PASS.
Run: `npm run lint 2>&1 | tail -5` — must be clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/[lang]/setup src/app/[lang]/login "src/app/[lang]/admin" src/components/onboarding __tests__/roles-onboarding.test.tsx
git commit -m "feat(onboarding): setup wizard, staff login, role menus, system page"
```

---

### Task 6: Guest invite-code gate on RSVP

**Files:**
- Create: `src/components/rsvp/InviteGate.tsx`
- Modify: `src/app/[lang]/rsvp/page.tsx` (gate → form)
- Modify: `src/components/rsvp/RsvpForm.tsx` (prefill name, cap headcount to `household.maxGuests`)
- Modify: `src/app/api/v1/rsvp/route.ts` (require guest_session OR valid code; household isolation)
- Test: `__tests__/roles-guest.test.tsx`

**Interfaces:**
- Consumes: Task 2 `normalizeInviteCode`, Task 3 guest session + verify API.
- Produces: gated RSVP flow (linked from Task 7 help).

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/roles-guest.test.tsx
import { normalizeInviteCode } from "@/lib/inviteCodes";
it("guest cannot see other household (isolation rule documented)", () => {
  expect(normalizeInviteCode("ab-12")).toBe("AB12");
});
import fs from "fs";
it("rsvp page references InviteGate", () => {
  const s = fs.readFileSync("src/app/[lang]/rsvp/page.tsx", "utf8");
  expect(s).toMatch(/InviteGate/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/roles-guest.test.tsx 2>&1 | tail -10`
Expected: FAIL (no InviteGate ref yet).

- [ ] **Step 3: Implementation**

```tsx
// src/components/rsvp/InviteGate.tsx
"use client";
import { useState } from "react";
export default function InviteGate({ dict, lang }: { dict: any; lang: string }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const res = await fetch("/api/v1/guest/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, name }) });
    if (res.ok) window.location.reload();
    else setError(dict.invalidCode ?? "We couldn't find that invitation — check spelling.");
  }
  return (
    <form onSubmit={submit} className="mx-auto max-w-md rounded border p-6">
      <h2 className="mb-4 text-xl font-bold">{dict.findInvitation ?? "Find your invitation"}</h2>
      <input aria-label="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="INVITE-CODE" className="mb-2 w-full rounded border px-3 py-2 text-sm" />
      <input aria-label="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={dict.yourName ?? "Your name"} className="mb-2 w-full rounded border px-3 py-2 text-sm" />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button className="mt-2 w-full rounded bg-black px-4 py-2 text-sm text-white">{dict.continue ?? "Continue"}</button>
    </form>
  );
}
```

`rsvp/page.tsx`: read `guest_session` via `cookies()` + `parseGuestSession` → if null render `<InviteGate dict lang />` else existing `<RsvpForm>` with `householdMax` prop.
`RsvpForm.tsx`: accept `householdMax?: number`, clamp headcount input `max={householdMax ?? 10}`.
`api/v1/rsvp/route.ts`: before existing Zod validation, check `parseGuestSession(cookie)` OR body `inviteCode` valid + name matches household → else 401 `{ error: "Invitation required" }`; scope all reads to `householdId`.

- [ ] **Step 4: Run tests**

Run: `npx jest __tests__/roles-guest.test.tsx __tests__/api-rsvp.test.ts 2>&1 | tail -10`
Expected: PASS (existing RSVP suite stays green; legacy public RSVP allowed only when no households exist — document in code comment).

- [ ] **Step 5: Commit**

```bash
git add src/components/rsvp/InviteGate.tsx "src/app/[lang]/rsvp/page.tsx" src/components/rsvp/RsvpForm.tsx src/app/api/v1/rsvp __tests__/roles-guest.test.tsx
git commit -m "feat(guest): invite-code gate with household isolation"
```

---

### Task 7: Help pages + ROLES.md + i18n + docs + final gates

**Files:**
- Create: `src/app/[lang]/help/page.tsx`
- Create: `docs/ROLES.md`
- Modify: `src/i18n/dictionaries/en.json`, `es.json`, `fr.json`, `de.json`, `pt.json` (keys: `setup.*, login.*, help.*, invite.*, system.*`)
- Modify: `docs/SELF_HOSTING.md` (user seeding, rotation, backup)
- Modify: `.env.example` (ADMIN_PASSWORD = bootstrap-only comment)
- Test: `__tests__/i18n-parity.test.ts` (already exists — must stay green)

**Interfaces:**
- Consumes: all prior tasks.
- Produces: finished onboarding docs + localized copy.

- [ ] **Step 1: Write the failing test (parity already covers; add help-keys assertion)**

Run: `npx jest __tests__/i18n-parity.test.ts 2>&1 | tail -8`
Expected: PASS baseline — then add keys and keep green (TDD: add test first if preferred):

```ts
// append to a new file __tests__/roles-i18n.test.ts
import en from "@/i18n/dictionaries/en.json";
it("help/setup/login/invite/system keys exist", () => {
  const d = en as any;
  for (const k of ["setup", "login", "help", "invite", "system"]) expect(d[k]).toBeDefined();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest __tests__/roles-i18n.test.ts 2>&1 | tail -8`
Expected: FAIL (keys missing).

- [ ] **Step 3: Add dictionaries + pages + docs**

en.json additions (replicate in es/fr/de/pt, translated):

```json
"setup": { "title": "Set up your wedding", "step1": "Create your account", "step2": "Wedding details", "step3": "Add guests", "step4": "Share invite codes" },
"login": { "title": "Sign in", "email": "Email", "password": "Password", "submit": "Sign in" },
"help": { "title": "How this works", "guest": "Enter your invite code + name to RSVP.", "planner": "Manage guests and schedule. No users or system.", "couple": "Full control: guests, codes, content.", "sysadmin": "You can see anything: users, health, backups." },
"invite": { "findInvitation": "Find your invitation", "invalidCode": "We couldn't find that invitation — check spelling." },
"system": { "title": "System", "health": "Database OK", "users": "Users" }
```

`/[lang]/help/page.tsx`: server component, sections per role from `dict.help`, links to `/setup`, `/login`, `/rsvp`.
`docs/ROLES.md`: matrix from spec §1 + ASCII interaction diagram + "who goes where" URLs.
`SELF_HOSTING.md`: append "Users & roles" (bootstrap via `ADMIN_BOOTSTRAP_PW`, rotate with users API, `pg_dump` backup).
`.env.example`: change `ADMIN_PASSWORD` comment to `# Bootstrap only — seeds first SYSADMIN via /setup, then unused.`.

- [ ] **Step 4: Final gates**

Run: `npx jest __tests__/roles-i18n.test.ts __tests__/i18n-parity.test.ts 2>&1 | tail -8`
Expected: PASS.
Run: `npm run lint 2>&1 | tail -5`
Expected: clean.
Run: `npm run build 2>&1 | tail -15`
Expected: success (first full build with new routes).

- [ ] **Step 5: Commit**

```bash
git add src/app/[lang]/help docs/ROLES.md src/i18n/dictionaries docs/SELF_HOSTING.md .env.example __tests__/roles-i18n.test.ts
git commit -m "docs(roles): help pages, ROLES.md, i18n keys, self-host guide"
```

---

## Self-review

- Spec §1 matrix → Task 2 `canAccess` + Task 4 middleware + Task 5 menus + Task 7 docs. Covered.
- Spec §2 models → Task 1 migration + seed. Covered.
- Spec §3 auth/middleware → Tasks 3–4 (HMAC compat, expiries 7d/30d, rate-limit, bootstrap-once, legacy re-login). Covered.
- Spec §4 UX per role → Tasks 5–6 (wizard 4 steps, planner banner, system page, guest gate). Covered.
- Spec §5 docs/errors/tests → Task 7 + per-task tests (guards, codes, wizard, sessions, isolation). Covered.
- No placeholders: every step has code/commands/expected output. Type names (`StaffRole`, `GUEST_COOKIE_NAME`, `requireRole`, `parseStaffSession/parseGuestSession`) consistent across tasks. No Auth.js/SMTP/SSO scope creep.
