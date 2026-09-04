# API Consolidation Design (fixes #22)

## Context
Canonical handlers live in `src/app/api/v1/*` (5 routes). HEAD also ships
file-system wrappers at `src/app/api/*/route.ts` (5 files re-exporting v1)
plus `next.config.mjs` rewrites for legacy unversioned paths. Build shows
14 routes for 7 handlers. Issue #22 requires one compat layer or none.

Decision (user, 2026-09-04): **Drop both now** — breaking change, no compat.

## Architecture
Single API surface: `src/app/api/v1/*` only. No wrappers, no rewrites.
- `src/app/api/v1/auth/route.ts` → POST/GET/DELETE `/api/v1/auth`
- `src/app/api/v1/guests/route.ts` → GET `/api/v1/guests`
- `src/app/api/v1/guests/[id]/route.ts` → PATCH `/api/v1/guests/:id`
- `src/app/api/v1/guests/export/route.ts` → GET `/api/v1/guests/export`
- `src/app/api/v1/rsvp/route.ts` → POST `/api/v1/rsvp`

Legacy `/api/auth`, `/api/guests*`, `/api/rsvp` return 404 after change.

## Components
1. **Wrappers deleted** (already in worktree): `src/app/api/auth/route.ts`,
   `src/app/api/guests/route.ts`, `src/app/api/guests/[id]/route.ts`,
   `src/app/api/guests/export/route.ts`, `src/app/api/rsvp/route.ts`.
   Also remove leftover empty dirs `src/app/api/guests/`, `src/app/api/guests/[id]/`,
   `src/app/api/guests/export/`.
2. **`next.config.mjs`**: remove `rewrites()` entirely (no compat layer).
   Keep file as empty `nextConfig` export for future use.
3. **`middleware.ts`**: drop legacy `/api/guests*` and `/api/auth`, `/api/rsvp`
   references in comments, `isGuestApi` check, and `config.matcher`.
   Keep `/api/v1/guests/:path*` only.
4. **`src/app/api/v1/README.md`**: rewrite compat section to Removal-done;
   remove rewrite instructions for new endpoints.
5. **`docs/SELF_HOSTING.md:132`**: update curl example to
   `/api/v1/guests/export`.

## Data flow
Client → `/api/v1/*` → thin route → service → repository → Prisma.
No rewrite indirection, no re-export indirection. Tests import canonical
handler directly (`@/app/api/v1/*/route`), unchanged.

## Error handling
Legacy unversioned fetches get Next 404 (breaking, intended). In-repo
clients already use `/api/v1/*` (verified: GuestTable, RsvpForm, login page,
config defaults). Middleware 401 behavior preserved for `/api/v1/guests*`.

## Testing
- `npm run build` — route count 5 API routes (was 14 with triple surface).
- `npx tsc --noEmit` — passes.
- `npm test` — api-rsvp + guest-pagination suites pass.
- Manual: `curl /api/guests` → 404; `curl /api/v1/guests` → 401 without cookie.

## Alternatives considered
- **Rewrites-only** (worktree current): non-breaking, single compat layer.
  Rejected per user: keeps legacy alive, defers cleanup.
- **Wrappers-only**: more files, no runtime rewrite benefit. Rejected:
  strictly worse than rewrites for maintenance.
