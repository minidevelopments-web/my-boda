# Roles & Onboarding (Guest / Couple / Planner / Sysadmin) — Design

Date: 2026-09-18
Status: approved §1-§5, pending spec review
Scope: RBAC + invite-code guests + first-run wizard + role dashboards + help docs
Approach: A — extend current HMAC cookie with roles (no new auth lib, no SMTP)

## Context

`my-boda` is Next.js 16 App Router + Prisma 7 Postgres + React 19, self-hosted, privacy-first.
Today: 2 implicit roles only — public guest (RSVP/info/registry, no login, name+email upsert) and
single admin (`ADMIN_PASSWORD`, HMAC-SHA256 `admin_session` httpOnly cookie, 7-day expiry,
Edge-compatible `verifySessionEdge` in `middleware.ts`, defense-in-depth `requireAdmin` /
`isAdminRequest` in route handlers). Routes live under `app/[lang]/` (EN/ES/DE). No `User` table.

Goal: 4 explicit roles each knowing how to interact at each step — guest, couple/brides (owners),
wedding planner (external editor), sysadmin (superuser, sees anything). Full flow: wizard + RBAC + docs.

Decisions (brainstorming): Full RBAC with logins · guests via household invite-code + name ·
sysadmin = superuser sees everything · onboarding = in-app wizards + dashboards + docs.

## §1 Roles & permissions (approved)

| Capability | Guest | Planner | Couple | Sysadmin |
|---|---|---|---|---|
| View home / info / registry | own household ctx | yes | yes | yes |
| Find invitation (code+name) → RSVP own | yes | — | — | impersonate/debug |
| Guests CRUD + CSV import/export | no | yes | yes | yes |
| Invite codes create/revoke | no | yes | yes | yes |
| Schedule / logistics / registry content edit | no | yes | yes | yes |
| Theme/accent copy guidance | no | read | yes | yes |
| User management (create planner/couple) | no | no | create planner only | full |
| System page (env status, DB health, backup, audit) | no | no | read-only health | full |
| Secrets / `.env` / destructive reset | no | no | no | yes (via host, surfaced read-only in UI) |

Rules:
- Middleware is source of truth at boundary; handlers re-check (defense-in-depth, current pattern kept).
- Planner sees "What you can't do" notice — no user management, no secrets, no wedding delete.
- Sysadmin can see/do anything (superuser). Couple owns wedding content; sysadmin owns system.
- Guest is household-scoped, never sees other households.

## §2 Data model (approved)

- New `User { id, email @unique, passwordHash (bcrypt, cost 12), role: COUPLE | PLANNER | SYSADMIN, createdAt }`.
- New `Household { id, label, inviteCode @unique (12-char nanoid, uppercase), maxGuests, expiresAt? , createdAt }`.
- `Guest += householdId String? → Household, inviteCodeUsed String?`. Existing guests backfilled to `null` (legacy public RSVP) or auto-household on import.
- `ADMIN_PASSWORD` becomes bootstrap: if `User.count()==0`, first-run `/setup` forces creation of SYSADMIN + COUPLE; legacy cookie still valid until first user created, then revoked.
- `RsvpResponse` unchanged, still linked to `Guest`.
- Household codes (not per-guest): one code per family/household, `maxGuests` caps RSVP headcount. Simpler, matches wedding reality.

## §3 Auth & middleware (approved)

- Session cookie keeps name `admin_session` (avoid breaking deploys), payload upgrades to
  `${userId}.${role}.${timestamp}.${randomHex}.${hmac}` where hmac = HMAC-SHA256(payload, secret).
  `secret` = `ADMIN_PASSWORD` (existing) — no new secret env. `verifySessionEdge` extended to parse
  role + expiry, still Edge-compatible WebCrypto, constant-time compare.
- Staff login: `/[lang]/login` (email + password, Zod-validated, rate-limited 5/min/IP via existing
  `src/lib/rateLimit.ts`). Sets httpOnly `SameSite=Lax`, `Secure` in prod, 7-day expiry. Logout clears.
- Guest gate: `/[lang]/rsvp` first step "Find your invitation" (inviteCode + name). Match =
  `Household.inviteCode` + name fuzzy within household guests. Sets separate `guest_session`
  httpOnly (householdId + guestId, HMAC-signed, 30-day). No passwords, no SMTP.
- Middleware matrix (on stripped pathname after locale):
  - `/admin` + `/admin/users*`, `/api/v1/admin/users*` → SYSADMIN only.
  - `/admin/*`, `/api/v1/guests*` → COUPLE | PLANNER | SYSADMIN (subpath `/admin/system*` → SYSADMIN only).
  - `/api/v1/rsvp` → guest_session OR public-with-valid-code (rate-limited).
  - Unauth page → 307 `/{lang}/login?next=...`; unauth API → 401 JSON `{ error }`.
- First-run: `User.count()==0` → any `/admin*` redirects to `/{lang}/setup` (create sysadmin + couple wizard).

## §4 Onboarding UX per role (approved)

- Guest: landing → "Find your invitation" (code + name, localized example) → personalized
  greeting + prefilled RSVP (headcount capped by `maxGuests`) → info/registry with household
  context + `?` tooltips + "Need help? Contact couple" link. Invalid code → "We couldn't find
  that invitation — check spelling" (no enumeration of valid codes).
- Couple (brides): `/setup` wizard, 4 steps: 1) create account, 2) wedding details
  (names/date/venue/theme — writes guidance for `.env` + DB-overridable copy), 3) import
  guests (CSV template + manual add), 4) create invite codes + copy share links.
  Dashboard home = checklist (X/Y guests responded, codes sent, schedule done) + empty states
  with CTA per card. All strings via dicts EN/ES/DE.
- Planner: invited by couple (email + temp password, must rotate on first login). Lands on
  limited dashboard: Guests, Schedule, Checklist only. Banner: "You're a planner — you can't
  manage users or system settings." No System menu rendered (not just disabled).
- Sysadmin: setup + `/admin/system` page: env presence (not values for secrets — `SET`/`MISSING`),
  DB health + pool stats, backup hints (`pg_dump` command + last-migration), user list,
  audit log (last 50 auth events). Links to `SELF_HOSTING.md` + `VERCEL.md`. Sees everything.
- Shared: `?` contextual help buttons, `/{lang}/help` per-role guide (same content as `docs/ROLES.md`
  condensed), `LanguageSwitcher` preserved, responsive + keyboard accessible.

## §5 Docs, errors & testing (approved)

- Docs: new `docs/ROLES.md` (matrix + interaction diagram: guest→code→RSVP, couple→setup→invite,
  planner→invite→edit, sysadmin→ops→all) + `/{lang}/help` pages + update `SELF_HOSTING.md`
  (user seeding, password rotation, backup) + `.env.example` comments (`ADMIN_PASSWORD` = bootstrap).
- Errors: wrong staff password → generic "Invalid email or password" + 401, rate-limit 429
  `Retry-After`; invalid guest code → localized not-found, no timing leak; expired guest session →
  re-enter code; corrupt cookie → clear + redirect login. API errors localized via `Accept-Language`
  (existing pattern). No stack traces to client.
- Tests (jest, existing harness): 1) role-guard matrix (middleware allows/denies per role×path),
  2) invite-code validation (valid/invalid/expired/capped), 3) setup wizard steps + bootstrap-once,
  4) bcrypt login success/fail + rate-limit, 5) `guest_session` isolation (household A can't see B).
  Build + lint gates unchanged (`npm run build`, `npm run lint`).
- Phasing (single spec, 3 plan slices): Phase 1 model + auth + middleware; Phase 2 wizards +
  dashboards; Phase 3 help pages + `ROLES.md` + polish/i18n parity. No Auth.js, no SMTP, no SSO in v1.

## Files to touch (for plan phase)

- New: `prisma` migration (User, Household, Guest.householdId), `src/app/[lang]/setup/*`,
  `src/app/[lang]/login/*`, `src/app/[lang]/help/*`, `src/components/onboarding/*`,
  `src/components/admin/SystemPage.tsx`, `src/lib/roles.ts`, `src/lib/inviteCodes.ts`,
  `src/lib/passwords.ts` (bcrypt), `docs/ROLES.md`, `__tests__/roles.*.test.ts`.
- Edit: `middleware.ts` (role parsing + matrix), `src/lib/auth.ts`, `src/lib/requireAdmin.ts`,
  `src/app/[lang]/rsvp/page.tsx` (code gate), `src/app/[lang]/admin/*` (role menus),
  `src/app/api/v1/**/*` (role checks), `src/i18n/dictionaries/*.json`, `.env.example`,
  `docs/SELF_HOSTING.md`.

## Self-review

- No TBDs; household (not per-guest) codes explicit; secret reuse explicit; cookie names explicit.
- Consistent: §1 matrix matches §3 middleware matrix and §4 menus; bootstrap-once matches §2.
- Scope fits one plan in 3 slices; v1 excludes Auth.js/SSO/SMTP — stated.
- Unambiguous: roles enum, code format (12-char uppercase nanoid), expiries (staff 7d, guest 30d),
  rate-limit (5/min), error shapes (401 JSON vs 307 redirect).
