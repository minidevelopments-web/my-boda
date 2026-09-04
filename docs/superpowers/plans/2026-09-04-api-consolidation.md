# API Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove both legacy compat layers so only `src/app/api/v1/*` serves (fixes #22).

**Architecture:** Delete file-system wrappers (already deleted in worktree, stage them), remove `rewrites()` from `next.config.mjs`, trim `middleware.ts` to v1-only, update docs. No new runtime code.

**Tech Stack:** Next.js App Router route handlers, `next.config.mjs` rewrites, Next middleware matcher.

## Global Constraints

- Canonical handlers live only in `src/app/api/v1/*` — never re-create wrappers.
- Legacy `/api/auth`, `/api/guests*`, `/api/rsvp` must 404 after change (intended breaking change).
- All in-repo fetches stay on `/api/v1/*` (already true).
- Verify with `npm run build` route count, `npx tsc --noEmit`, `npm test`.

---

### Task 1: Remove rewrites from next.config.mjs

**Files:**
- Modify: `next.config.mjs`
- Test: `npm run build` (route list)

**Interfaces:**
- Consumes: current `next.config.mjs` with `rewrites()` returning 4 entries.
- Produces: empty `nextConfig` with no `rewrites` key; later tasks rely on no legacy serving.

- [ ] **Step 1: Replace next.config.mjs content**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

File `next.config.mjs` must contain exactly the 4 lines above (delete the entire `async rewrites()` block and its comments).

- [ ] **Step 2: Verify file has no rewrites**

Run: `grep -c rewrites next.config.mjs || echo "no-match"`
Expected: `no-match` (exit 0 from echo, grep exit 1 means absent — good).

- [ ] **Step 3: Commit**

```bash
git add next.config.mjs
git commit -m "refactor(api): remove legacy rewrites, v1-only (#22)"
```

### Task 2: Trim middleware to v1-only

**Files:**
- Modify: `middleware.ts:72-130`
- Test: `npm test -- __tests__/middleware.test.ts` if exists, else `npx tsc --noEmit`

**Interfaces:**
- Consumes: Task 1 output (no rewrites, so legacy paths 404 anyway).
- Produces: `middleware()` guarding only `/api/v1/guests*`; `config.matcher` without `/api/guests/:path*`.

- [ ] **Step 1: Update middleware doc comment**

Replace in `middleware.ts`:
```ts
 * - Protects `/api/v1/guests*` and `/api/guests*` (API) → returns 401 JSON.
 * - Leaves public routes untouched: `/admin/login`, `/api/v1/auth`, `/api/auth`, `/api/v1/rsvp`, `/api/rsvp`.
```
With:
```ts
 * - Protects `/api/v1/guests*` (API) → returns 401 JSON.
 * - Leaves public routes untouched: `/admin/login`, `/api/v1/auth`, `/api/v1/rsvp`.
```

- [ ] **Step 2: Update isGuestApi check**

Replace in `middleware.ts`:
```ts
  // Guest APIs: /api/v1/guests and /api/guests (and all sub-paths)
  const isGuestApi =
    pathname === "/api/v1/guests" ||
    pathname.startsWith("/api/v1/guests/") ||
    pathname === "/api/guests" ||
    pathname.startsWith("/api/guests/");
```
With:
```ts
  // Guest API: /api/v1/guests (and all sub-paths). Legacy unversioned
  // paths were removed in #22 and now 404.
  const isGuestApi =
    pathname === "/api/v1/guests" ||
    pathname.startsWith("/api/v1/guests/");
```

- [ ] **Step 3: Update matcher**

Replace in `middleware.ts`:
```ts
export const config = {
  matcher: [
    "/admin/:path*",
    "/api/v1/guests/:path*",
    "/api/guests/:path*",
  ],
};
```
With:
```ts
export const config = {
  matcher: [
    "/admin/:path*",
    "/api/v1/guests/:path*",
  ],
};
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 5: Commit**

```bash
git add middleware.ts
git commit -m "refactor(api): middleware guards v1 guests only (#22)"
```

### Task 3: Update README and SELF_HOSTING docs

**Files:**
- Modify: `src/app/api/v1/README.md`
- Modify: `docs/SELF_HOSTING.md:132`
- Test: `grep -rn "/api/guests" docs/SELF_HOSTING.md src/app/api/v1/README.md` shows only historical mentions

**Interfaces:**
- Consumes: Tasks 1–2 (no compat layers remain).
- Produces: docs stating Removal-done; no rewrite instructions for new endpoints.

- [ ] **Step 1: Rewrite README compat sections**

In `src/app/api/v1/README.md`, replace:
```md
Legacy unversioned paths (`/api/guests`, `/api/rsvp`, …) are served via
**`next.config.mjs` rewrites only** — the former file-system wrapper
re-exports at `src/app/api/<domain>/route.ts` were removed (fixes #22).
One compat layer, not two.
```
With:
```md
Legacy unversioned paths (`/api/guests`, `/api/rsvp`, `/api/auth`) were
removed in #22. No wrappers, no rewrites — requests to them return 404.
Use `/api/v1/*` exclusively.
```

Replace the `## Adding a new endpoint` step 2:
```md
2. Add a rewrite in `next.config.mjs` for legacy fetch compat **only if** an unversioned URL previously existed:
   ```js
   { source: "/api/<domain>/:path*", destination: "/api/v1/<domain>/:path*" }
   ```
```
With:
```md
2. Client fetches must use `/api/v1/<domain>` directly. Do not add rewrites or wrappers.
```

Replace the `## Deprecation timeline` section with:
```md
## Removal notice (legacy unversioned paths)

- **2026-09-04 (#22)** — removed file-system wrappers and `next.config.mjs`
  rewrites. Legacy paths 404. All in-repo clients use `/api/v1/*`.
```

Replace the `## Auth note`:
```md
Auth is canonical at `/api/v1/auth`. The legacy `/api/auth` path works via rewrite during the deprecation window above.
```
With:
```md
Auth is canonical at `/api/v1/auth` only.
```

- [ ] **Step 2: Update SELF_HOSTING curl example**

In `docs/SELF_HOSTING.md:132`, replace:
```bash
curl -H "Cookie: session=..." http://localhost:3000/api/guests/export -o guests.csv
```
With:
```bash
curl -H "Cookie: session=..." http://localhost:3000/api/v1/guests/export -o guests.csv
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/README.md docs/SELF_HOSTING.md
git commit -m "docs(api): mark legacy paths removed, v1-only (#22)"
```

### Task 4: Stage wrapper deletions, clean dirs, verify

**Files:**
- Modify (stage deletions): `src/app/api/auth/route.ts`, `src/app/api/guests/route.ts`, `src/app/api/guests/[id]/route.ts`, `src/app/api/guests/export/route.ts`, `src/app/api/rsvp/route.ts`
- Test: `npm run build`, `npx tsc --noEmit`, `npm test`

**Interfaces:**
- Consumes: Tasks 1–3 (config, middleware, docs done).
- Produces: single commit staging wrapper deletions; build shows 5 API routes; issue #22 closable.

- [ ] **Step 1: Remove leftover empty dirs**

Run: `rmdir -p src/app/api/guests/\[id\] src/app/api/guests/export 2>/dev/null; rmdir src/app/api/guests 2>/dev/null; ls -R src/app/api`
Expected: `src/app/api/` contains only `v1` (plus `v1/README.md`, no `guests/` dir).

- [ ] **Step 2: Stage wrapper deletions**

Run: `git add -A src/app/api && git status --short -- src/app/api`
Expected: `D` entries for the 5 wrapper files (already deleted in worktree), no `M` for v1 handlers.

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Run tests**

Run: `npm test 2>&1 | tail -n 15`
Expected: all suites pass (api-rsvp 12/12, guest-pagination passes).

- [ ] **Step 5: Run build and check route count**

Run: `npm run build 2>&1 | grep -E "Route|/api/" | head -n 20`
Expected: 5 API routes under `/api/v1/*`, zero under unversioned `/api/(auth|guests|rsvp)` (excluding `/api/v1` prefix).

- [ ] **Step 6: Commit and push**

```bash
git commit -m "refactor(api): consolidate to v1-only surface (fixes #22)"
git push origin main
```
