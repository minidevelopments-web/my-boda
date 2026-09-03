# API v1 — Domain-Driven, Versioned Structure

Canonical API routes live under `src/app/api/v1/<domain>/`.

```
src/app/api/
├── v1/                       # Versioned, domain-grouped (canonical)
│   ├── auth/route.ts         # POST /api/v1/auth (login), GET (session), DELETE (logout)
│   ├── guests/route.ts       # GET /api/v1/guests
│   ├── guests/[id]/route.ts  # PATCH /api/v1/guests/:id
│   ├── guests/export/route.ts# GET /api/v1/guests/export (CSV)
│   └── rsvp/route.ts         # POST /api/v1/rsvp
├── auth/route.ts             # ← wrapper re-exporting ../v1/auth/route (legacy compat)
├── guests/route.ts           # ← wrapper → ../v1/guests/route
├── guests/[id]/route.ts      # ← wrapper → ../../v1/guests/[id]/route
├── guests/export/route.ts    # ← wrapper → ../../v1/guests/export/route
└── rsvp/route.ts             # ← wrapper → ../v1/rsvp/route
```

## Why this layout

- **Domain grouping** — each business domain (`guests`, `rsvp`, `auth`) owns a folder. Adding a new feature (e.g. `registry`, `schedule`) means creating `src/app/api/v1/<newDomain>/route.ts` — no flat list.
- **Versioning** — breaking changes go to `v2/` while `v1/` stays frozen. Clients pin to `/api/v1/...`; legacy unversioned paths (`/api/guests`) are kept via **both** file-system wrappers and `next.config.mjs` rewrites, so existing fetches and `import "@/app/api/<domain>/route"` in tests keep working.
- **DRY** — legacy files are thin re-exports (`export { GET } from "../v1/…"`), so logic lives once in `v1/`. Changing business logic requires editing only the `v1/` handler.

## Adding a new endpoint

1. Create `src/app/api/v1/<domain>/route.ts` (or sub-route) and implement handlers using `@/lib/services/*` (thin route → service → repository).
2. If you need backward compat for an old unversioned URL, add a wrapper at `src/app/api/<domain>/route.ts`:
   ```ts
   // src/app/api/<domain>/route.ts
   export { GET, POST } from "../v1/<domain>/route";
   ```
3. Optionally add a rewrite in `next.config.mjs` for runtime fetch compat:
   ```js
   { source: "/api/<domain>/:path*", destination: "/api/v1/<domain>/:path*" }
   ```
4. Update client fetches to `/api/v1/<domain>`; wrappers + rewrites guarantee old clients still work.

## Auth note

Auth is versioned at `/api/v1/auth` **and** remains at `/api/auth` (wrapper). Both are canonical via re-export, matching the issue's example where `auth` was shown outside `v1/` while still supporting the versioned path.
