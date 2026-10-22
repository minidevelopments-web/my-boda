# Guest Photo Gallery — Design

**Date:** 2026-10-22
**Status:** Approved in conversation, pending written-spec review

## Problem

Guests want to share photos taken at the wedding, and the couple wants one
private place to see them. Today the site has no upload or media storage at
all: images are static assets in `public/`, and every page is env- or
DB-driven.

## Goal

An invite-only gallery where verified guests can upload photos and browse
everyone's photos. Uploads publish immediately; the couple and planners can
delete any photo, and a guest can delete their own household's photos.

Non-goals: likes, comments, albums, video, captions editing, lightbox,
download-all, moderation queue, S3/Vercel Blob, multi-instance support.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Audience | Verified guests only | Reuses the existing `guest_session` invite-code gate; matches the privacy-first promise |
| Storage | Local disk under `UPLOAD_DIR` | Self-hosted target; no new service or credentials |
| Processing | Server re-encodes to JPEG with `sharp` | Strips EXIF/GPS, fixes rotation, prevents serving SVG/HTML |
| Publish | Immediate, delete-only moderation | Lowest friction for a trusted guest list |
| Burst handling | Browser pre-resize + in-process 2-job queue | Prevents OOM/CPU stalls without Redis |
| Caching | One-week immutable browser cache on photo files | Thumbnails are content-addressed and never rewritten |

## Data model

```prisma
model GalleryPhoto {
  id           String   @id @default(cuid())
  householdId  String
  guestId      String
  uploaderName String
  caption      String?
  fileName     String   // {id}.jpg
  thumbName    String   // {id}.thumb.jpg
  mimeType     String   // image/jpeg after processing
  width        Int
  height       Int
  bytes        Int
  createdAt    DateTime @default(now())

  @@index([createdAt])
}
```

No Prisma relations on purpose: deleting a guest or household must not delete
photos. `householdId` is used for upload quota and delete authorization,
`guestId`/`uploaderName` for attribution.

## Storage

- Root: `UPLOAD_DIR`, default `./data/uploads` (resolved absolute at runtime).
- Files: `{id}.jpg` (max 2048 px long edge, quality 82) and `{id}.thumb.jpg`
  (max 480 px long edge). The original bytes are never persisted.
- Docker: named volume `uploads_data:/app/data/uploads`, env
  `UPLOAD_DIR=/app/data/uploads`. Volume data survives rebuilds and must be
  included in backups alongside Postgres.
- All names come from the DB row; request input never becomes a path.

## Upload pipeline

1. Browser decodes the file with `createImageBitmap` (honoring EXIF
   orientation), draws it to a canvas at max 2048 px, exports JPEG at 0.85,
   then uploads that blob. If decoding fails (e.g. HEIC in Chrome), the
   original file is uploaded and the server decides.
2. `POST /api/v1/gallery` requires a valid guest session. It rejects
   `Content-Length` over 32 MB before buffering, then parses multipart.
3. Limits: 1–3 files per request, 10 MB per file, 50 stored photos per
   household, 10 requests/minute per household. Caption ≤ 280 characters.
4. Each file goes through the module-level 2-job queue, which calls `sharp`:
   decode → rotate → resize → JPEG. A decode failure rejects that file with a
   clear message; other files in the batch still succeed.
5. Write full + thumb, insert `GalleryPhoto`, return the created rows.
6. Client shows per-file status, then a single `router.refresh()` when the
   batch finishes.

## API

| Method + path | Auth | Behavior |
|---|---|---|
| `POST /api/v1/gallery` | guest session | multipart upload; returns `{ data: GalleryPhoto[] }`; 400/401/413/429 as applicable |
| `GET /api/v1/gallery/[id]/file?variant=thumb\|full` | guest **or** staff session | streams the file with `Content-Type: image/jpeg`, `Cache-Control: private, max-age=604800, immutable`, `X-Content-Type-Options: nosniff`; 404 if row or file missing |
| `DELETE /api/v1/gallery/[id]` | own household **or** staff | deletes row, then best-effort unlinks both files; 204 |

Gallery listing is server-rendered directly from Prisma; there is no list
endpoint. Newest first, 48 per page with prev/next links.

## UI

- New page `/{lang}/gallery`.
- Server-side gate: valid `guest_session` (household exists, not expired) or
  valid staff session. Otherwise render the existing `InviteGate`.
- Verified guest sees grid + `GalleryUpload`. Staff sees grid + delete buttons.
- Grid: responsive 2/3/4 columns, plain `<img>` (the Next image optimizer
  cannot forward the auth cookie), `alt` falls back to uploader name.
- Own photos get a delete button for the uploading household.
- Upload control: multi-select, optional caption applied to the batch, local
  previews, per-file status, retry on failure, and disabled submit while
  uploading.
- Header gains a "Photos" nav link.
- Dictionary keys added under `gallery` and `nav.photos` in all five locales;
  the existing parity test enforces completeness.

## Security and privacy

- Every photo byte is behind the session check. IDs are cuids, but access
  never relies on unguessability.
- Re-encoding through `sharp` guarantees served bytes are JPEG; uploaded SVG,
  HTML, or polyglot files cannot be served as active content.
- EXIF/GPS metadata is removed on the server regardless of whether browser
  resize ran.
- Auth, quota, and delete decisions use server-side session data only;
  `uploaderName` is resolved from the guest row (fallback `"Guest"` if that
  row was deleted), never trusted from the client.
- Every gallery request using a guest session re-validates that the household
  still exists and has not expired, mirroring the RSVP route. The page, file
  route, upload, and delete all apply this check.
- Delete authorization: staff roles `COUPLE|PLANNER|SYSADMIN` may delete any
  photo; a guest may delete only rows whose `householdId` matches their
  session.
- One-week `private` cache means a borrowed phone does not retain photos
  indefinitely after the session ends.

## Concurrency / “rush” handling

- The 2-job queue serializes `sharp` work so a burst queues rather than
  exhausting RAM. It is process-local: valid for the documented
  single-container deployment.
- Early size rejection prevents buffering oversized bodies.
- Browser resize cuts upload bytes by roughly 5–10× on phone photos.
- No Redis, job runner, or CDN. `shortcut:` comment on the queue documents the
  single-instance assumption and when to replace it.

## Configuration and docs

- `.env.example`: `UPLOAD_DIR` (server-only, default `./data/uploads`).
- `docker-compose.yml`: `uploads_data` volume + `UPLOAD_DIR`.
- `Dockerfile`: no change required; the app creates the directory at runtime.
- `README.md`: gallery feature row + env table entry.
- `docs/SELF_HOSTING.md`: gallery storage, backup (`pg_dump` + uploads
  volume), and 1 GB RAM recommendation.
- `docs/VERCEL.md`: state that the gallery requires persistent disk and is not
  supported on Vercel as configured.
- `package.json`: declare `sharp` as a direct dependency (currently only
  transitive via Next).

## Testing

- Storage/processing helpers: temp `UPLOAD_DIR` + fixture buffers generated
  with `sharp`; assert full and thumb dimensions, JPEG mime, EXIF removal, and
  path containment.
- Route tests with `NextRequest` and cookie headers:
  - no session → 401 on upload/read/delete;
  - invalid or oversize file rejected;
  - guest A cannot delete household B's photo, can delete its own;
  - staff role can delete any;
  - `variant` outside `thumb|full` rejected.
- Rate-limit test for the configurable window/max, plus an assertion that
  existing callers keep their 5/15-minute defaults.
- i18n parity stays green after dictionary additions.
- Manual: upload from an iPhone, confirm orientation, thumbnails, gate, staff
  delete, and that a 10-photo burst completes without a server restart.

## Rollout

1. `npx prisma migrate dev --name gallery_photos`
2. Deploy with the uploads volume mounted; verify `UPLOAD_DIR` is writable.
3. Smoke-test: guest verify → upload → reload → staff delete.
