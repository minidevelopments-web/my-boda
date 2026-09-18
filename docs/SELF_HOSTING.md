# Self-Hosting Guide — my-boda

This guide covers deploying my-boda on your own infrastructure with Docker, configuring environment, putting it behind a reverse proxy with TLS, using a custom domain, migrating data, and backing up.

## Prerequisites

- A VPS / NAS / home server with Docker Engine ≥ 24 and Docker Compose v2
- A domain name (optional but recommended) with DNS access
- ~512 MB RAM, 1 vCPU, 2 GB disk is enough (Postgres via compose, no heavy deps)

## 1. Docker Quick Start

```bash
git clone https://github.com/minidevelopments-web/my-boda.git
cd my-boda
cp .env.example .env
# Edit .env — at minimum set NEXT_PUBLIC_COUPLE_NAME, NEXT_PUBLIC_WEDDING_DATE,
# NEXT_PUBLIC_VENUE, and ADMIN_PASSWORD
docker compose up --build -d
docker compose ps        # app should be "healthy" / running
docker compose logs -f app
```

Open `http://YOUR_SERVER_IP:3000`. Admin at `/admin`.

### What the compose file does

- Builds from `Dockerfile` (Node 20 Alpine, `prisma generate`, `next build`)
- Exposes `3000:3000` and `expose: 3000`
- Sets `DATABASE_URL=postgresql://myboda:myboda@postgres:5432/myboda` (Postgres service; same default as the build arg)
- Persists DB via named volume `postgres_data:/var/lib/postgresql/data` — survives rebuilds
- `restart: unless-stopped` — survives host reboots
- `healthcheck` polls `http://localhost:3000/` every 30s (start period 40s)

### Updating

```bash
git pull
docker compose up --build -d
```

Postgres data is preserved in the `postgres_data` volume.

### Postgres (default — `postgres:16-alpine` service)

Compose already wires the `postgres` service — no extra steps needed:

1. `prisma/schema.prisma` datasource provider is `postgresql`.
2. `DATABASE_URL` defaults in `.env` / compose to:
   ```
   DATABASE_URL="postgresql://myboda:myboda@postgres:5432/myboda"
   ```
3. Run migration:
   ```bash
   docker compose exec app npx prisma migrate deploy
   ```
4. `docker compose up --build -d`

Do not mix SQLite and Postgres URLs without migrating — see Migration below.

## 2. Environment

All vars are in `.env.example` with comments. Key groups:

- `NEXT_PUBLIC_*` — inlined at **build time**. After changing any of them, rebuild: `docker compose up --build -d`.
- `DATABASE_URL` — server-only. Default is `postgresql://myboda:myboda@postgres:5432/myboda` (backed by the `postgres_data` volume).
- `ADMIN_PASSWORD` — server-only. Compared via HMAC hash; session is httpOnly cookie with 7-day expiry. Change from default before exposing publicly.

See [README.md](../README.md#environment-variables) table and `.env.example` header comments for every var.

## 3. Reverse Proxy & TLS

Do not expose Node directly to the internet — put it behind a reverse proxy that terminates TLS.

### Option A: Caddy (simplest, auto-TLS)

`Caddyfile` on host:

```
yourdomain.com {
    reverse_proxy localhost:3000
}
```

```bash
docker run -d --name caddy -p 80:80 -p 443:443 \
  -v $PWD/Caddyfile:/etc/caddy/Caddyfile \
  -v caddy_data:/data caddy:2-alpine
```

Caddy obtains and renews Let's Encrypt certs automatically.

### Option B: Nginx + Certbot

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then `certbot --nginx -d yourdomain.com` for TLS.

### Option C: Traefik / Cloudflare Tunnel

Traefik: label the `app` service; Cloudflare Tunnel: `cloudflared tunnel --url http://localhost:3000`.

Ensure `X-Forwarded-Proto` is forwarded so Next.js detects HTTPS correctly.

## 4. Custom Domain

1. Point DNS `A` (or `CNAME`) for `yourdomain.com` (and optionally `www`) to your server IP / tunnel.
2. Configure reverse proxy above for that hostname.
3. Wait for TLS issuance, then test `https://yourdomain.com` and `https://yourdomain.com/admin`.
4. Optional: set `NEXT_PUBLIC_VENUE_MAP_URL` to your venue map link — no domain coupling.

No code change needed for the domain itself — the app has no hardcoded host.

## 5. Migration

### SQLite → Postgres (legacy migration path — only if you ran the old SQLite stack)

```bash
# 1. Export guests as CSV from /admin (or via API)
curl -H "Cookie: session=..." http://localhost:3000/api/v1/guests/export -o guests.csv

# 2. Switch DATABASE_URL and compose postgres service (see above)

# 3. Deploy schema to Postgres
docker compose exec app npx prisma migrate deploy

# 4. Re-import: use prisma seed or a small script to insert from guests.csv
#    Alternatively, use `pgloader` or Prisma's `db push` for manual migration.
```

### Host migration (SQLite legacy path — for Postgres use `pg_dump` / `pg_restore` instead, see below)

```bash
# On old host
docker compose exec app sh -c "cp /app/data/dev.db /tmp/backup.db"
docker cp $(docker compose ps -q app):/tmp/backup.db ./my-boda-backup.db

# On new host (after git clone + docker compose up)
docker cp ./my-boda-backup.db $(docker compose ps -q app):/app/data/dev.db
docker compose restart app
```

For Postgres, use `pg_dump` / `pg_restore` instead.

## 6. Backup

### SQLite (legacy/dev-only — the compose default is Postgres)

The DB is a single file at volume `sqlite_data` → `/app/data/dev.db` inside the container.

**Cron example on host:**

```cron
0 3 * * * docker cp $(docker compose -f /opt/my-boda/docker-compose.yml ps -q app):/app/data/dev.db /backups/my-boda-$(date +\%F).db
```

Or back up the volume directly:

```bash
docker run --rm -v my-boda_sqlite_data:/data -v /backups:/backup alpine cp /data/dev.db /backup/my-boda-$(date +%F).db
```

Keep at least 7 daily copies off-host. Test restores periodically:

```bash
docker cp /backups/my-boda-2027-06-01.db $(docker compose ps -q app):/app/data/dev.db
docker compose restart app
```

### Postgres

```bash
docker compose exec postgres pg_dump -U myboda myboda > backup.sql
# Restore
cat backup.sql | docker compose exec -T postgres psql -U myboda myboda
```

### What to back up

- DB file/dump (guests + RSVPs)
- `.env` (secrets — store encrypted, not in git)
- Optionally `docker-compose.yml` if you customized it

No object storage — all data is in the DB.

## 7. Users & Roles

Roles: guest (invite-code only), planner, couple, sysadmin — see
[ROLES.md](./ROLES.md) for the full matrix.

**Bootstrap (first run only):**

```bash
# Option A — via the setup wizard (recommended):
# open https://yourdomain.com/en/setup, create the sysadmin + couple accounts.
# POST /api/v1/admin/setup returns 403 once any User exists.

# Option B — via seed script (headless):
ADMIN_EMAIL=sysadmin@example.com ADMIN_BOOTSTRAP_PW='long-random-secret' npx prisma db seed
# Creates a SYSADMIN only when the User table is empty; otherwise a no-op.
```

**Rotation:** sysadmins manage accounts via the users API
(`GET/POST /api/v1/admin/users`, sysadmin-only; couples can create planners
via `POST /api/v1/admin/planners`). To rotate a password, delete + recreate
the user or update `passwordHash` with `bcrypt.hash(pw, 12)`.

**Backup:** Postgres holds everything (guests, RSVPs, users, households):

```bash
docker compose exec postgres pg_dump -U myboda myboda > backup.sql
# Restore:
cat backup.sql | docker compose exec -T postgres psql -U myboda myboda
```

Keep at least 7 daily dumps off-host. Note: dumps contain `passwordHash`
values (bcrypt, non-reversible) — store encrypted.

## Troubleshooting

- `app` unhealthy: `docker compose logs app` — check `DATABASE_URL` and that `prisma generate` ran (Dockerfile does it).
- `NEXT_PUBLIC_*` changes not visible: rebuild — `docker compose up --build -d` (they are build-time).
- Admin login fails: `ADMIN_PASSWORD` only seeds the first SYSADMIN via `/setup` when the User table is empty — afterwards logins use DB users; if locked out, reset via the users API/DB, not env match. Check cookie is `httpOnly` and not blocked by proxy.
- Port 3000 in use: change `ports: ["3001:3000"]` in compose and update proxy target.
