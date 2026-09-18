# Roles & Access — my-boda

Four roles govern who can do what. Enforcement is defense-in-depth:
`middleware.ts` (Edge mirror) redirects/401s first, route handlers re-check
via `requireRole` in `src/lib/requireAdmin.ts`.

## Access matrix

| Area              | Guest | Planner | Couple | Sysadmin |
|-------------------|-------|---------|--------|----------|
| RSVP (own invite) | ✅    | —       | —      | —        |
| Guests dashboard  | ❌    | ✅      | ✅     | ✅       |
| Content (info/registry/schedule) | ❌ | ✅ | ✅ | ✅ |
| Create planners   | ❌    | ❌      | ✅     | ✅       |
| Users list/create | ❌    | ❌      | ❌     | ✅       |
| System page/health/backups | ❌ | ❌ | ❌ | ✅ |

Notes:

- `canAccess(role, area)` in `src/lib/roles.ts` encodes this matrix.
- Couple creates planners only via `POST /api/v1/admin/planners`
  (forced `role: "PLANNER"`); generic user management is sysadmin-only.
- Legacy pre-role staff tokens have no role claim → middleware forces re-login.
- Guest sessions (`guest_session`, 30-day HMAC) are scoped to one household.
- Staff sessions (`admin_session`, 7-day HMAC) carry `userId.role` claims.

## Interaction diagram

```
            ┌─────────┐
            │  Guest  │── invite code + name ──▶ POST /api/v1/guest/verify
            └─────────┘        │                        │ sets guest_session
                               ▼                        ▼
                        /[lang]/rsvp ── InviteGate ──▶ RsvpForm (household-scoped)

 ┌──────────┐  /setup (bootstrap-once)   ┌──────────────────┐
 │ New site │ ──────────────────────────▶ │ POST /api/v1/    │
 └──────────┘  creates SYSADMIN+COUPLE    │ admin/setup      │
                                            └──────────────────┘
 ┌──────────┐  email+password   ┌──────────────┐  admin_session (userId.role)
 │  Staff   │ ────────────────▶ │ POST /api/v1 │ ──▶ /admin (menus per role)
 │ (all 3)  │                   │ auth         │      ├─ planner: guests only (+banner)
 └──────────┘                   └──────────────┘      ├─ couple: guests + create planners
                                                     └─ sysadmin: + /admin/system, /admin/users

 middleware.ts (Edge): parses role from token, 307 /login or 401 per matrix
 route handlers: requireRole(req, ...allowed) re-checks (defense-in-depth)
```

## Who goes where

| Who      | Start here        | Then                                  |
|----------|-------------------|---------------------------------------|
| Guest    | `/{lang}/rsvp`    | Enter invite code + name (InviteGate) |
| Couple   | `/{lang}/setup`   | First run only; afterwards `/{lang}/login` → `/{lang}/admin` |
| Planner  | `/{lang}/login`   | `/{lang}/admin` (guests + schedule, no Users/System) |
| Sysadmin | `/{lang}/login`   | `/{lang}/admin` + `/{lang}/admin/system` (health, users, backup hint) |
| Anyone   | `/{lang}/help`    | What each role can do, with links to setup/login/rsvp |
