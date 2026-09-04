# API v1 — Domain-Driven, Versioned Structure

Canonical API routes live under `src/app/api/v1/<domain>/`.

```
src/app/api/
└── v1/                       # Versioned, domain-grouped (canonical)
    ├── auth/route.ts         # POST /api/v1/auth (login), GET (session), DELETE (logout)
    ├── guests/route.ts       # GET /api/v1/guests
    ├── guests/[id]/route.ts  # PATCH /api/v1/guests/:id
    ├── guests/export/route.ts# GET /api/v1/guests/export (CSV)
    └── rsvp/route.ts         # POST /api/v1/rsvp
```

Legacy unversioned paths (`/api/guests`, `/api/rsvp`, `/api/auth`) were
removed in #22. No wrappers, no rewrites — requests to them return 404.
Use `/api/v1/*` exclusively.

## Why this layout

- **Domain grouping** — each business domain (`guests`, `rsvp`, `auth`) owns a folder. Adding a new feature (e.g. `registry`, `schedule`) means creating `src/app/api/v1/<newDomain>/route.ts` — no flat list.
- **Versioning** — breaking changes go to `v2/` while `v1/` stays frozen. Clients pin to `/api/v1/...`; legacy unversioned paths 404 since #22 — there is no deprecation window.
- **DRY** — logic lives once in `v1/`. Changing business logic requires editing only the `v1/` handler; there is no compat layer — no wrappers, no rewrites.
- **Tests** — import the canonical handler directly (`import { POST } from "@/app/api/v1/rsvp/route"`); no wrapper indirection.

## Adding a new endpoint

1. Create `src/app/api/v1/<domain>/route.ts` (or sub-route) and implement handlers using `@/lib/services/*` (thin route → service → repository).
2. Client fetches must use `/api/v1/<domain>` directly. Do not add rewrites or wrappers.
3. Update client fetches to `/api/v1/<domain>`; old clients on legacy paths 404 and must migrate to `/api/v1/*`.

## Removal notice (legacy unversioned paths)

- **2026-09-04 (#22)** — removed file-system wrappers and `next.config.mjs`
  rewrites. Legacy paths 404. All in-repo clients use `/api/v1/*`.

## Auth note

Auth is canonical at `/api/v1/auth` only.
