# Self-Hosting Guide — my-boda

This guide covers deploying my-boda on your own infrastructure with Docker, configuring environment, putting it behind a reverse proxy with TLS, using a custom domain, migrating data, and backing up.

## Prerequisites

- A VPS / NAS / home server with Docker Engine ≥ 24 and Docker Compose v2
- A domain name (optional but recommended) with DNS access
- ~512 MB RAM, 1 vCPU, 2 GB disk is enough (SQLite, no heavy deps)

## 1. Docker Quick Start

```bash
git clone https://github.com/your-org/my-boda.git
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

- Builds from `Dockerfile` (Node 20 Alpine, `better-sqlite3` native deps, `prisma generate`, `next build`)
- Exposes `3000:3000` and `expose: 3000`
- Sets `DATABASE_URL=file:/app/data/dev.db` (SQLite file inside container; build arg `DATABASE_URL=file:./data/dev.db` for host)
- Persists DB via named volume `sqlite_data:/app/data` — survives rebuilds (isolated from `/app/prisma` migrations)
- `restart: unless-stopped` — survives host reboots
- `healthcheck` polls `http://localhost:3000/` every 30s (start period 40s)

### Updating

```bash
git pull
docker compose up --build -d
```

SQLite data is preserved in the `sqlite_data` volume.

### Using Postgres (optional)

For larger guest lists or managed DB preference:

1. Uncomment the `postgres` service in `docker-compose.yml`.
2. Change `prisma/schema.prisma` datasource provider to `postgresql` (if you switch permanently).
3. Set in `.env`:
   ```
   DATABASE_URL="postgresql://myboda:myboda@postgres:5432/myboda"
   ```
4. Run migration:
   ```bash
   docker compose exec app npx prisma migrate deploy
   ```
5. `docker compose up --build -d`

Do not mix SQLite and Postgres URLs without migrating — see Migration below.

## 2. Environment

All vars are in `.env.example` with comments. Key groups:

- `NEXT_PUBLIC_*` — inlined at **build time**. After changing any of them, rebuild: `docker compose up --build -d`.
- `DATABASE_URL` — server-only. SQLite default is `file:/app/data/dev.db` in container / `file:./data/dev.db` locally (backed by `sqlite_data:/app/data` volume).
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

### SQLite → Postgres

```bash
# 1. Export guests as CSV from /admin (or via API)
curl -H "Cookie: session=..." http://localhost:3000/api/v1/guests/export -o guests.csv

# 2. Switch DATABASE_URL and compose postgres service (see above)

# 3. Deploy schema to Postgres
docker compose exec app npx prisma migrate deploy

# 4. Re-import: use prisma seed or a small script to insert from guests.csv
#    Alternatively, use `pgloader` or Prisma's `db push` for manual migration.
```

### Host migration

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

### SQLite (default)

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

## Troubleshooting

- `app` unhealthy: `docker compose logs app` — check `DATABASE_URL` and that `prisma generate` ran (Dockerfile does it).
- `NEXT_PUBLIC_*` changes not visible: rebuild — `docker compose up --build -d` (they are build-time).
- Admin login fails: ensure `ADMIN_PASSWORD` matches between build env and runtime; check cookie is `httpOnly` and not blocked by proxy.
- Port 3000 in use: change `ports: ["3001:3000"]` in compose and update proxy target.
