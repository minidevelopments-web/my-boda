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
