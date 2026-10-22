# Guest Photo Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an invite-only wedding photo gallery where verified guests upload, browse, and delete their own photos, and staff can delete any photo.

**Architecture:** One `GalleryPhoto` table stores metadata; re-encoded JPEGs live on disk under `UPLOAD_DIR`. Browser-side canvas resize plus a process-local 2-job `sharp` queue handle wedding-day bursts. The existing `guest_session` cookie gates the page and every file request.

**Tech Stack:** Next.js 16.3.4 App Router (Route Handlers, async `params`), React 19.1.1, Prisma 7.10.0 + Postgres, `sharp` 0.35.4 (already installed transitively; declare it directly), Zod 4.5.4, Tailwind 4.3.3, Jest 29 + ts-jest.

**Spec:** `docs/superpowers/specs/2026-10-22-guest-photo-gallery-design.md`

## Global Constraints

- Guest auth is the existing HMAC `guest_session` cookie (`src/lib/auth.ts`), 30-day expiry; staff auth is `admin_session`. Never invent a second auth mechanism.
- Every gallery request that uses a guest session must re-validate the household exists and is not expired, mirroring `src/app/api/v1/rsvp/route.ts`.
- Uploaded bytes are never persisted: always decode and re-encode through `sharp` to JPEG.
- Limits: 10 MB per file, 3 files per request, 50 stored photos per household, 10 upload requests/minute per household, caption ≤ 280 chars.
- `UPLOAD_DIR` defaults to `./data/uploads`; all file paths are derived from DB rows, never request input.
- User-visible strings live in `src/i18n/dictionaries/{en,es,fr,de,pt}.json`; the parity test must stay green.
- Route handlers use Node runtime (filesystem + `sharp`); `params` is a Promise in Next 16.
- Commands: `npm test`, `npm run build`, `npm run lint`, `npx prisma generate`.

## Review Focus

- A non-image file renamed `.jpg` must be rejected by decode, not stored or served.
- A batch with one bad file must not leave orphan files on disk and must not lose the valid files.
- An expired/deleted household session must get 401 on file reads and uploads, not photos.
- A burst of concurrent uploads must stay memory-bounded (2-job queue) and resolve without unhandled rejections.
- Deleting a photo that belongs to another household must return 403 and leave the file in place.

---

### Task 1: Prisma model, migration, and `sharp` dependency

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261022120000_gallery_photos/migration.sql`
- Modify: `package.json`
- Test: `__tests__/gallery-model.test.ts`

**Interfaces:**
- Produces: Prisma model `GalleryPhoto` with fields `id, householdId, guestId, uploaderName, caption, fileName, thumbName, mimeType, width, height, bytes, createdAt`; generated type `GalleryPhoto` from `@prisma/client`; direct dependency `sharp`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/gallery-model.test.ts
import fs from "fs";

it("declares the GalleryPhoto model and fields", () => {
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
  expect(schema).toMatch(/model GalleryPhoto/);
  for (const field of [
    "householdId", "guestId", "uploaderName", "caption",
    "fileName", "thumbName", "mimeType", "width", "height", "bytes",
  ]) {
    expect(schema).toContain(field);
  }
  expect(schema).toMatch(/@@index\(\[createdAt\]\)/);
});

it("declares sharp as a direct dependency", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  expect(pkg.dependencies.sharp).toBeDefined();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest __tests__/gallery-model.test.ts`
Expected: FAIL — `GalleryPhoto` and `sharp` missing.

- [ ] **Step 3: Add the model, migration SQL, and dependency**

Append to `prisma/schema.prisma` exactly:

```prisma
model GalleryPhoto {
  id           String   @id @default(cuid())
  householdId  String
  guestId      String
  uploaderName String
  caption      String?
  fileName     String
  thumbName    String
  mimeType     String
  width        Int
  height       Int
  bytes        Int
  createdAt    DateTime @default(now())

  @@index([createdAt])
}
```

Create `prisma/migrations/20261022120000_gallery_photos/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "GalleryPhoto" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "uploaderName" TEXT NOT NULL,
    "caption" TEXT,
    "fileName" TEXT NOT NULL,
    "thumbName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GalleryPhoto_createdAt_idx" ON "GalleryPhoto"("createdAt");
```

Add `"sharp": "^0.35.4"` to `dependencies` in `package.json` (the installed tree already has this exact version via Next). Then sync the lockfile without touching `node_modules`:

```bash
npm install --package-lock-only
```

Run: `npx prisma generate`

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/gallery-model.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261022120000_gallery_photos package.json package-lock.json __tests__/gallery-model.test.ts
git commit -m "feat(gallery): add GalleryPhoto model and sharp dependency"
```

---

### Task 2: Storage and image processing

**Files:**
- Create: `src/lib/gallery/storage.ts`
- Test: `__tests__/gallery-storage.test.ts`

**Interfaces:**
- Produces:
  - constants `MAX_FILE_BYTES = 10 * 1024 * 1024`, `MAX_FILES_PER_UPLOAD = 3`, `MAX_PHOTOS_PER_HOUSEHOLD = 50`, `MAX_CAPTION_LENGTH = 280`, `FULL_MAX_EDGE = 2048`, `THUMB_MAX_EDGE = 480`
  - `type StoredPhoto = { fileName: string; thumbName: string; mimeType: "image/jpeg"; width: number; height: number; bytes: number }`
  - `getUploadRoot(): string`
  - `processAndStore(id: string, input: Buffer): Promise<StoredPhoto>`
  - `readPhotoFile(fileName: string): Promise<Buffer | null>`
  - `deletePhotoFiles(photo: { fileName: string; thumbName: string }): Promise<void>`

- [ ] **Step 1: Write the failing test**

```ts
/**
 * @jest-environment node
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import sharp from "sharp";
import {
  deletePhotoFiles,
  getUploadRoot,
  processAndStore,
  readPhotoFile,
} from "@/lib/gallery/storage";

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "gallery-"));
  process.env.UPLOAD_DIR = dir;
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
  delete process.env.UPLOAD_DIR;
});

it("writes a 2048px full JPEG and a 480px thumbnail, stripped of EXIF", async () => {
  const input = await sharp({
    create: { width: 3000, height: 2000, channels: 3, background: "#ffffff" },
  }).jpeg().toBuffer();
  const stored = await processAndStore("photo1", input);

  expect(stored.fileName).toBe("photo1.jpg");
  expect(stored.thumbName).toBe("photo1.thumb.jpg");
  expect(stored.mimeType).toBe("image/jpeg");
  expect(Math.max(stored.width, stored.height)).toBe(2048);

  const full = await sharp(await readPhotoFile(stored.fileName)!).metadata();
  expect(full.exif).toBeUndefined();
  expect(Math.max(full.width!, full.height!)).toBe(2048);

  const thumb = await sharp(await readPhotoFile(stored.thumbName)!).metadata();
  expect(Math.max(thumb.width!, thumb.height!)).toBe(480);
});

it("rejects non-image bytes", async () => {
  await expect(processAndStore("bad", Buffer.from("<svg/>"))).rejects.toThrow();
});

it("rejects path traversal names", async () => {
  await expect(readPhotoFile("../etc/passwd")).rejects.toThrow();
});

it("processes concurrent uploads and deletes both files", async () => {
  const input = await sharp({
    create: { width: 800, height: 600, channels: 3, background: "#000000" },
  }).jpeg().toBuffer();
  const results = await Promise.all(
    ["a", "b", "c", "d"].map((id) => processAndStore(id, input))
  );
  expect(results).toHaveLength(4);
  expect(getUploadRoot()).toBe(dir);
  await deletePhotoFiles(results[0]);
  expect(await readPhotoFile(results[0].fileName)).toBeNull();
  expect(await readPhotoFile(results[0].thumbName)).toBeNull();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest __tests__/gallery-storage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/gallery/storage.ts`**

Implementation notes (the test pins the rest):
- `getUploadRoot()` returns `path.resolve(process.env.UPLOAD_DIR || "./data/uploads")`.
- `photoPath(fileName)` rejects names containing `/`, `\`, or `..`, then verifies `path.dirname(resolved) === root`.
- `processAndStore` runs through an internal `runWithImageSlot` promise semaphore with `MAX_CONCURRENCY = 2`; add `// shortcut: process-local queue assumes one container; replace with a real queue if scaled out.`
- `sharp(input).rotate()` → `resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })` → `.jpeg({ quality: 82 })`; thumbnail equivalent at 480. Write both with `fs.mkdir(root, { recursive: true })` first.
- Use `sharp(buffer).metadata()` on the processed buffer for final `width`, `height`, and `bytes = full.length`.
- Any decode error propagates; no files are written before both buffers exist.
- `readPhotoFile` returns `null` on `ENOENT`, throws on traversal names.
- `deletePhotoFiles` uses `fs.unlink` with `force: true`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/gallery-storage.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/gallery/storage.ts __tests__/gallery-storage.test.ts
git commit -m "feat(gallery): add disk storage and image processing"
```

---

### Task 3: Viewer resolution and configurable rate limit

**Files:**
- Create: `src/lib/gallery/viewer.ts`
- Modify: `src/lib/rateLimit.ts`
- Test: `__tests__/gallery-viewer.test.ts`
- Test: `__tests__/rate-limit.test.ts`

**Interfaces:**
- Consumes: `parseGuestSession`, `parseStaffSession` from `@/lib/auth`; `prisma.household.findUnique`; `checkRateLimit`.
- Produces:
  - `type GalleryViewer = { kind: "guest"; householdId: string; guestId: string; name: string } | { kind: "staff"; role: "COUPLE" | "PLANNER" | "SYSADMIN" }`
  - `resolveGalleryViewer(guestToken: string | undefined, staffToken: string | undefined): Promise<GalleryViewer | null>`
  - `checkRateLimit(key: string, opts?: { maxAttempts?: number; windowMs?: number }): { allowed: boolean; retryAfterMs: number; remaining: number }` with defaults unchanged (`5` attempts / 15 minutes).

- [ ] **Step 1: Write the failing tests**

```ts
/**
 * @jest-environment node
 */
import { createGuestSession, createStaffSession } from "@/lib/auth";
import { resolveGalleryViewer } from "@/lib/gallery/viewer";

const mockFindUnique = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: { household: { findUnique: (...args: unknown[]) => mockFindUnique(...args) } },
}));

beforeEach(() => {
  process.env.ADMIN_PASSWORD = "secret";
  mockFindUnique.mockReset();
});

it("resolves a valid guest household and guest name", async () => {
  mockFindUnique.mockResolvedValue({
    id: "h1",
    expiresAt: null,
    guests: [{ id: "g1", name: "Ana" }],
  });
  const viewer = await resolveGalleryViewer(createGuestSession("h1", "g1"), undefined);
  expect(viewer).toEqual({ kind: "guest", householdId: "h1", guestId: "g1", name: "Ana" });
});

it("falls back to Guest when the guest row was deleted", async () => {
  mockFindUnique.mockResolvedValue({ id: "h1", expiresAt: null, guests: [] });
  const viewer = await resolveGalleryViewer(createGuestSession("h1", "gone"), undefined);
  expect(viewer).toMatchObject({ kind: "guest", name: "Guest" });
});

it("rejects an expired household and a bad token", async () => {
  mockFindUnique.mockResolvedValue({
    id: "h1",
    expiresAt: new Date(Date.now() - 1000),
    guests: [{ id: "g1", name: "Ana" }],
  });
  expect(await resolveGalleryViewer(createGuestSession("h1", "g1"), undefined)).toBeNull();
  expect(await resolveGalleryViewer("nonsense", undefined)).toBeNull();
});

it("resolves staff and prefers guest when both cookies exist", async () => {
  mockFindUnique.mockResolvedValue({
    id: "h1", expiresAt: null, guests: [{ id: "g1", name: "Ana" }],
  });
  expect(
    await resolveGalleryViewer(undefined, createStaffSession("u1", "COUPLE"))
  ).toEqual({ kind: "staff", role: "COUPLE" });
  expect(
    await resolveGalleryViewer(createGuestSession("h1", "g1"), createStaffSession("u1", "PLANNER"))
  ).toMatchObject({ kind: "guest" });
});
```

```ts
// __tests__/rate-limit.test.ts
import { checkRateLimit, clearRateLimitStore } from "@/lib/rateLimit";

beforeEach(() => clearRateLimitStore());

it("keeps the 5-attempt default", () => {
  for (let i = 0; i < 5; i++) expect(checkRateLimit("default").allowed).toBe(true);
  expect(checkRateLimit("default").allowed).toBe(false);
});

it("honors custom limits", () => {
  expect(checkRateLimit("custom", { maxAttempts: 2, windowMs: 60_000 }).allowed).toBe(true);
  expect(checkRateLimit("custom", { maxAttempts: 2, windowMs: 60_000 }).allowed).toBe(true);
  expect(checkRateLimit("custom", { maxAttempts: 2, windowMs: 60_000 }).allowed).toBe(false);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest __tests__/gallery-viewer.test.ts __tests__/rate-limit.test.ts`
Expected: FAIL — `viewer` missing; custom options ignored.

- [ ] **Step 3: Implement**

`src/lib/gallery/viewer.ts`: parse guest token with `parseGuestSession`; if present, look up the household with `include: { guests: true }`; return `null` on missing/expired household or DB error (fail closed); resolve `name` from `guests.find(g => g.id === guestId)?.name ?? "Guest"`. Otherwise parse staff token with `parseStaffSession` and return `{ kind: "staff", role }` for `COUPLE|PLANNER|SYSADMIN`.

`src/lib/rateLimit.ts`: change the signature to accept the options object, use `const maxAttempts = opts.maxAttempts ?? MAX_ATTEMPTS; const windowMs = opts.windowMs ?? WINDOW_MS;` inside, and keep all existing callers untouched.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/gallery-viewer.test.ts __tests__/rate-limit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gallery/viewer.ts src/lib/rateLimit.ts __tests__/gallery-viewer.test.ts __tests__/rate-limit.test.ts
git commit -m "feat(gallery): resolve gallery viewers and allow custom rate limits"
```

---

### Task 4: Upload endpoint

**Files:**
- Create: `src/app/api/v1/gallery/route.ts`
- Test: `__tests__/gallery-upload.test.ts`

**Interfaces:**
- Consumes: `resolveGalleryViewer`, `processAndStore`, limits from `@/lib/gallery/storage`, `checkRateLimit`, `prisma`.
- Produces: `POST(req: NextRequest): Promise<NextResponse>`; success `201 { data: GalleryPhoto[] }`; partial failure `201 { data, errors: string[] }`; all failed `400 { error: string, errors: string[] }`.

- [ ] **Step 1: Write the failing test**

```ts
/**
 * @jest-environment node
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { createGuestSession } from "@/lib/auth";
import { POST } from "@/app/api/v1/gallery/route";

const mockHousehold = jest.fn();
const mockCount = jest.fn();
const mockCreate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    household: { findUnique: (...a: unknown[]) => mockHousehold(...a) },
    galleryPhoto: {
      count: (...a: unknown[]) => mockCount(...a),
      create: (...a: unknown[]) => mockCreate(...a),
    },
  },
}));

let dir: string;
const cookie = () => `guest_session=${createGuestSession("h1", "g1")}`;
async function jpeg(): Promise<Buffer> {
  return sharp({ create: { width: 400, height: 300, channels: 3, background: "#fff" } })
    .jpeg().toBuffer();
}
function uploadRequest(files: File[], caption = ""): NextRequest {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  if (caption) form.append("caption", caption);
  return new NextRequest("http://localhost/api/v1/gallery", {
    method: "POST",
    body: form,
    headers: { cookie: cookie() },
  });
}

beforeEach(async () => {
  process.env.ADMIN_PASSWORD = "secret";
  process.env.UPLOAD_DIR = dir = await fs.mkdtemp(path.join(os.tmpdir(), "gallery-upload-"));
  mockHousehold.mockResolvedValue({ id: "h1", expiresAt: null, guests: [{ id: "g1", name: "Ana" }] });
  mockCount.mockResolvedValue(0);
  mockCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => data);
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
  delete process.env.UPLOAD_DIR;
});

it("rejects requests without a guest session", async () => {
  const req = new NextRequest("http://localhost/api/v1/gallery", { method: "POST", body: new FormData() });
  expect((await POST(req)).status).toBe(401);
});

it("stores a valid upload with the server-side uploader name", async () => {
  const res = await POST(uploadRequest([new File([await jpeg()], "a.jpg", { type: "image/jpeg" })], "Sunset"));
  expect(res.status).toBe(201);
  const body = await res.json();
  expect(body.data).toHaveLength(1);
  expect(body.data[0]).toMatchObject({ householdId: "h1", guestId: "g1", uploaderName: "Ana", caption: "Sunset" });
  expect(mockCreate).toHaveBeenCalledTimes(1);
});

it("rejects more than 3 files and non-image bytes", async () => {
  const files = Array.from({ length: 4 }, () => new File([Buffer.from("x")], "a.jpg", { type: "image/jpeg" }));
  expect((await POST(uploadRequest(files))).status).toBe(400);

  const bad = new File([Buffer.from("<svg/>")], "evil.jpg", { type: "image/jpeg" });
  const res = await POST(uploadRequest([bad]));
  expect(res.status).toBe(400);
  expect((await res.json()).errors.length).toBeGreaterThan(0);
  expect(mockCreate).not.toHaveBeenCalled();
});

it("enforces the household photo quota", async () => {
  mockCount.mockResolvedValue(50);
  const res = await POST(uploadRequest([new File([await jpeg()], "a.jpg", { type: "image/jpeg" })]));
  expect(res.status).toBe(400);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest __tests__/gallery-upload.test.ts`
Expected: FAIL — route module not found.

- [ ] **Step 3: Implement `POST`**

Implementation notes:
- `export const runtime = "nodejs";`
- Resolve viewer from `req.cookies`; guest or staff may upload? **Only guests** upload (staff can browse/delete): return 401 unless `viewer.kind === "guest"`.
- Reject `Number(req.headers.get("content-length") ?? 0) > 32 * 1024 * 1024` with 413 before `formData()`.
- Rate limit key `gallery:${householdId}` with `{ maxAttempts: 10, windowMs: 60_000 }`; return 429 + `Retry-After`.
- Read `files` via `formData.getAll("files").filter((f): f is File => f instanceof File)`; reject count `< 1` or `> MAX_FILES_PER_UPLOAD` with 400.
- Caption: trim, empty → `null`, length > `MAX_CAPTION_LENGTH` → 400.
- Quota: `prisma.galleryPhoto.count({ where: { householdId } })`; if `existing + files.length > 50` → 400.
- Per file: reject `file.size > MAX_FILE_BYTES`; generate `id = crypto.randomUUID()`; `processAndStore(id, Buffer.from(await file.arrayBuffer()))`; on success `prisma.galleryPhoto.create({ data: { id, householdId, guestId, uploaderName: viewer.name, caption, ...stored } })`. On any per-file error, delete that id's files if they exist and push the message to `errors`; continue with the rest.
- Return `201 { data: created, ...(errors.length ? { errors } : {}) }`, or `400 { error: "No photos could be uploaded", errors }` when `created.length === 0`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/gallery-upload.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/gallery/route.ts __tests__/gallery-upload.test.ts
git commit -m "feat(gallery): add guest photo upload endpoint"
```

---

### Task 5: File streaming and delete endpoints

**Files:**
- Create: `src/app/api/v1/gallery/[id]/file/route.ts`
- Create: `src/app/api/v1/gallery/[id]/route.ts`
- Test: `__tests__/gallery-file-delete.test.ts`

**Interfaces:**
- Consumes: `resolveGalleryViewer`, `readPhotoFile`, `deletePhotoFiles`, `prisma.galleryPhoto`.
- Produces: `GET(req, { params })` and `DELETE(req, { params })` where `params: Promise<{ id: string }>`.

- [ ] **Step 1: Write the failing test**

```ts
/**
 * @jest-environment node
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { createGuestSession, createStaffSession } from "@/lib/auth";
import { processAndStore } from "@/lib/gallery/storage";
import { GET } from "@/app/api/v1/gallery/[id]/file/route";
import { DELETE } from "@/app/api/v1/gallery/[id]/route";

const mockFindUnique = jest.fn();
const mockDelete = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    household: { findUnique: (...a: unknown[]) => mockFindUnique(...a) },
    galleryPhoto: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      delete: (...a: unknown[]) => mockDelete(...a),
    },
  },
}));

let dir: string;
let photo: Awaited<ReturnType<typeof processAndStore>>;
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const get = (id: string, variant: string, cookie?: string) =>
  new NextRequest(`http://localhost/api/v1/gallery/${id}/file?variant=${variant}`, {
    headers: cookie ? { cookie } : {},
  });
const del = (id: string, cookie?: string) =>
  new NextRequest(`http://localhost/api/v1/gallery/${id}`, {
    method: "DELETE",
    headers: cookie ? { cookie } : {},
  });

beforeEach(async () => {
  process.env.ADMIN_PASSWORD = "secret";
  process.env.UPLOAD_DIR = dir = await fs.mkdtemp(path.join(os.tmpdir(), "gallery-file-"));
  const input = await sharp({ create: { width: 600, height: 400, channels: 3, background: "#fff" } })
    .jpeg().toBuffer();
  photo = await processAndStore("p1", input);
  mockFindUnique.mockReset();
  mockDelete.mockReset();
  mockFindUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) =>
    where.id === "p1"
      ? { id: "p1", householdId: "h1", ...photo }
      : { id: "h1", expiresAt: null, guests: [{ id: "g1", name: "Ana" }] }
  );
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
  delete process.env.UPLOAD_DIR;
});

it("serves thumbnails to a verified guest and rejects anonymous/unknown variants", async () => {
  const ok = await GET(get("p1", "thumb", `guest_session=${createGuestSession("h1", "g1")}`), params("p1"));
  expect(ok.status).toBe(200);
  expect(ok.headers.get("content-type")).toBe("image/jpeg");
  expect(ok.headers.get("cache-control")).toContain("private");

  expect((await GET(get("p1", "thumb"), params("p1"))).status).toBe(401);
  expect((await GET(get("p1", "huge", `guest_session=${createGuestSession("h1", "g1")}`), params("p1"))).status).toBe(400);
});

it("lets a household delete its own photo and blocks another household", async () => {
  const other = await DELETE(del("p1", `guest_session=${createGuestSession("h2", "g9")}`), params("p1"));
  expect(other.status).toBe(403);
  expect(mockDelete).not.toHaveBeenCalled();

  const own = await DELETE(del("p1", `guest_session=${createGuestSession("h1", "g1")}`), params("p1"));
  expect(own.status).toBe(204);
  expect(mockDelete).toHaveBeenCalledWith({ where: { id: "p1" } });
});

it("lets staff delete any photo", async () => {
  const res = await DELETE(del("p1", `admin_session=${createStaffSession("u1", "COUPLE")}`), params("p1"));
  expect(res.status).toBe(204);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest __tests__/gallery-file-delete.test.ts`
Expected: FAIL — route modules not found.

- [ ] **Step 3: Implement both routes**

File route:
- `export const runtime = "nodejs";`
- Await `params`; validate `variant` is `"thumb" | "full"`, else 400.
- `resolveGalleryViewer(guestCookie, staffCookie)`; null → 401.
- `prisma.galleryPhoto.findUnique({ where: { id } })`; missing → 404.
- `readPhotoFile(variant === "thumb" ? photo.thumbName : photo.fileName)`; null → 404.
- Return `new Response(new Uint8Array(data), { headers: { "Content-Type": photo.mimeType, "Content-Length": String(data.length), "Cache-Control": "private, max-age=604800, immutable", "X-Content-Type-Options": "nosniff" } })`.

Delete route:
- `export const runtime = "nodejs";`
- Resolve viewer; null → 401.
- Fetch photo; missing → 404.
- If `viewer.kind === "guest" && photo.householdId !== viewer.householdId` → 403.
- `prisma.galleryPhoto.delete({ where: { id } })`, then `await deletePhotoFiles(photo).catch(() => {})`; return `new Response(null, { status: 204 })`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/gallery-file-delete.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/v1/gallery/[id]/file/route.ts" "src/app/api/v1/gallery/[id]/route.ts" __tests__/gallery-file-delete.test.ts
git commit -m "feat(gallery): serve and delete gallery photos"
```

---

### Task 6: Gallery page, upload UI, grid, navigation, and translations

**Files:**
- Create: `src/app/[lang]/gallery/page.tsx`
- Create: `src/components/gallery/GalleryUpload.tsx`
- Create: `src/components/gallery/GalleryGrid.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/i18n/dictionaries/en.json`, `es.json`, `fr.json`, `de.json`, `pt.json`
- Test: `__tests__/gallery-ui.test.tsx`

**Interfaces:**
- Consumes: `resolveGalleryViewer`, `prisma.galleryPhoto.findMany/count`, `InviteGate`.
- Produces:
  - `GalleryGrid` props `{ photos: GalleryPhotoView[]; lang: string; messages: Dictionary["gallery"] }` where `GalleryPhotoView = { id, caption, uploaderName, width, height, createdAt: string, canDelete: boolean }`
  - `GalleryUpload` props `{ messages: Dictionary["gallery"] }`
  - exported `resizeForUpload(file: File): Promise<Blob | File>`

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/gallery-ui.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { resizeForUpload } from "@/components/gallery/GalleryUpload";
import en from "@/i18n/dictionaries/en.json";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: push }) }));

const photo = {
  id: "p1", caption: "Sunset", uploaderName: "Ana", width: 2048, height: 1365,
  createdAt: new Date().toISOString(), canDelete: true,
};

it("renders thumbnails and deletes after confirmation", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204 } as Response);
  jest.spyOn(window, "confirm").mockReturnValue(true);

  render(<GalleryGrid photos={[photo]} lang="en" messages={en.gallery} />);
  expect(screen.getByAltText("Sunset")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: en.gallery.delete }));
  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith("/api/v1/gallery/p1", { method: "DELETE" })
  );
  expect(push).toHaveBeenCalled();
});

it("shows the empty state", () => {
  render(<GalleryGrid photos={[]} lang="en" messages={en.gallery} />);
  expect(screen.getByText(en.gallery.empty)).toBeInTheDocument();
});

it("falls back to the original file when the browser cannot decode it", async () => {
  const file = new File(["not-an-image"], "a.heic", { type: "image/heic" });
  expect(await resizeForUpload(file)).toBe(file);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest __tests__/gallery-ui.test.tsx`
Expected: FAIL — components and dictionary key missing.

- [ ] **Step 3: Implement**

**Dictionaries** — add `"photos"` to `nav` and this `gallery` block to each file. English:

```json
"gallery": {
  "title": "Wedding photos",
  "subtitle": "Share the moments you captured — every invited guest can see them.",
  "uploadTitle": "Add your photos",
  "chooseFiles": "Choose photos",
  "caption": "Caption (optional)",
  "captionPlaceholder": "A few words about these photos",
  "upload": "Upload",
  "uploading": "Uploading…",
  "preparing": "Preparing…",
  "done": "Uploaded",
  "delete": "Delete",
  "deleteConfirm": "Delete this photo for everyone?",
  "empty": "No photos yet — be the first to share one.",
  "photoCount": "{count} photos",
  "errors": {
    "noFiles": "Choose at least one photo.",
    "tooMany": "Up to 3 photos at a time.",
    "tooLarge": "Each photo must be under 10 MB.",
    "invalidType": "That file could not be read as a photo.",
    "quota": "This invitation has reached its photo limit.",
    "rateLimited": "Too many uploads — wait a minute and try again.",
    "uploadFailed": "Upload failed. Please try again.",
    "deleteFailed": "Could not delete the photo."
  }
}
```

Spanish: `nav.photos` = `"Fotos"`; `title` `"Fotos de la boda"`; `subtitle` `"Comparte los momentos que capturaste: todos los invitados pueden verlos."`; `uploadTitle` `"Añade tus fotos"`; `chooseFiles` `"Elegir fotos"`; `caption` `"Pie de foto (opcional)"`; `captionPlaceholder` `"Unas palabras sobre estas fotos"`; `upload` `"Subir"`; `uploading` `"Subiendo…"`; `preparing` `"Preparando…"`; `done` `"Subida"`; `delete` `"Eliminar"`; `deleteConfirm` `"¿Eliminar esta foto para todos?"`; `empty` `"Aún no hay fotos: sé el primero en compartir una."`; `photoCount` `"{count} fotos"`; errors: `"Elige al menos una foto."`, `"Máximo 3 fotos a la vez."`, `"Cada foto debe pesar menos de 10 MB."`, `"No se pudo leer ese archivo como foto."`, `"Esta invitación ha alcanzado el límite de fotos."`, `"Demasiadas subidas: espera un minuto e inténtalo de nuevo."`, `"No se pudo subir. Inténtalo de nuevo."`, `"No se pudo eliminar la foto."`

French: `"Photos"`; `"Photos du mariage"`; `"Partagez les moments que vous avez capturés — tous les invités peuvent les voir."`; `"Ajoutez vos photos"`; `"Choisir des photos"`; `"Légende (facultatif)"`; `"Quelques mots sur ces photos"`; `"Envoyer"`; `"Envoi…"`; `"Préparation…"`; `"Envoyée"`; `"Supprimer"`; `"Supprimer cette photo pour tout le monde ?"`; `"Pas encore de photos — soyez le premier à en partager une."`; `"{count} photos"`; errors: `"Choisissez au moins une photo."`, `"3 photos maximum à la fois."`, `"Chaque photo doit faire moins de 10 Mo."`, `"Ce fichier n'a pas pu être lu comme une photo."`, `"Cette invitation a atteint sa limite de photos."`, `"Trop d'envois — attendez une minute et réessayez."`, `"L'envoi a échoué. Réessayez."`, `"Impossible de supprimer la photo."`

German: `"Fotos"`; `"Hochzeitsfotos"`; `"Teile die Momente, die du festgehalten hast — alle Eingeladenen können sie sehen."`; `"Füge deine Fotos hinzu"`; `"Fotos auswählen"`; `"Bildunterschrift (optional)"`; `"Ein paar Worte zu diesen Fotos"`; `"Hochladen"`; `"Wird hochgeladen…"`; `"Wird vorbereitet…"`; `"Hochgeladen"`; `"Löschen"`; `"Dieses Foto für alle löschen?"`; `"Noch keine Fotos — teile als Erste:r eines."`; `"{count} Fotos"`; errors: `"Wähle mindestens ein Foto aus."`, `"Höchstens 3 Fotos auf einmal."`, `"Jedes Foto muss unter 10 MB groß sein."`, `"Diese Datei konnte nicht als Foto gelesen werden."`, `"Diese Einladung hat ihr Fotolimit erreicht."`, `"Zu viele Uploads — warte eine Minute und versuche es erneut."`, `"Upload fehlgeschlagen. Bitte erneut versuchen."`, `"Foto konnte nicht gelöscht werden."`

Portuguese: `"Fotos"`; `"Fotos do casamento"`; `"Partilhe os momentos que capturou — todos os convidados podem vê-los."`; `"Adicione as suas fotos"`; `"Escolher fotos"`; `"Legenda (opcional)"`; `"Algumas palavras sobre estas fotos"`; `"Enviar"`; `"A enviar…"`; `"A preparar…"`; `"Enviada"`; `"Eliminar"`; `"Eliminar esta foto para todos?"`; `"Ainda não há fotos — seja o primeiro a partilhar uma."`; `"{count} fotos"`; errors: `"Escolha pelo menos uma foto."`, `"Máximo de 3 fotos de cada vez."`, `"Cada foto deve ter menos de 10 MB."`, `"Não foi possível ler esse ficheiro como foto."`, `"Este convite atingiu o limite de fotos."`, `"Demasiados envios — aguarde um minuto e tente novamente."`, `"O envio falhou. Tente novamente."`, `"Não foi possível eliminar a foto."`

**Page** `src/app/[lang]/gallery/page.tsx`:
- `export const dynamic = "force-dynamic";`
- Read cookies: `guest_session`, `admin_session`; `viewer = await resolveGalleryViewer(...)`.
- If `!viewer`, render the title and `<InviteGate dict={(dict as any).invite ?? {}} />`.
- Otherwise read `?page=` (default 1), page size 48; `prisma.galleryPhoto.findMany({ orderBy: { createdAt: "desc" }, skip, take: 48 })` and `count()`; render `GalleryUpload` only for guests, `GalleryGrid` with `canDelete = viewer.kind === "staff" || photo.householdId === viewer.householdId`, and prev/next links that preserve `/{lang}/gallery?page=N`.

**`GalleryUpload`**:
- Hidden file input + label, `multiple`, `accept="image/*"`.
- Show a local preview (`URL.createObjectURL`) and status per selected file so the guest sees something immediately.
- `resizeForUpload`: if `typeof createImageBitmap !== "function"` return the file; try `createImageBitmap(file, { imageOrientation: "from-image" })`, scale longest edge to 2048, `canvas.toBlob(..., "image/jpeg", 0.85)`; return the new JPEG `File` only if it is smaller than the original; on any error return the original. Add `// shortcut: browser resize relies on createImageBitmap; unsupported formats (HEIC in Chrome) fall back to the original upload.`
- Submit in chunks of 3 sequentially; `FormData` with `files` and `caption`; parse `{ error, errors }`; set per-file status `preparing | uploading | done | error`; call `router.refresh()` once after all chunks; clear selection and caption on full success.

**`GalleryGrid`**:
- Empty state when `photos.length === 0`.
- Grid `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3`.
- Thumbnail `<a href={`/api/v1/gallery/${id}/file?variant=full`} target="_blank" rel="noreferrer">` wrapping `<img src={...thumb} alt={caption || uploaderName} loading="lazy" width={width} height={height} className="h-full w-full object-cover" />`; add `// eslint-disable-next-line @next/next/no-img-element` because the optimizer cannot forward the auth cookie.
- Caption + uploader line; delete button only when `canDelete`, `confirm(messages.deleteConfirm)`, `DELETE /api/v1/gallery/{id}`, then `router.refresh()`; surface `messages.errors.deleteFailed` on failure.

**Header** `src/components/layout/Header.tsx`: add `{ path: "/gallery", href: `/${lang}/gallery`, label: nav.photos }` after Info.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/gallery-ui.test.tsx __tests__/i18n-parity.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[lang]/gallery/page.tsx" src/components/gallery src/components/layout/Header.tsx src/i18n/dictionaries __tests__/gallery-ui.test.tsx
git commit -m "feat(gallery): add gallery page, upload UI, and translations"
```

---

### Task 7: Deployment config and documentation

**Files:**
- Modify: `.env.example`
- Modify: `docker-compose.yml`
- Modify: `README.md`
- Modify: `docs/SELF_HOSTING.md`
- Modify: `docs/VERCEL.md`
- Test: `__tests__/gallery-config.test.ts`

**Interfaces:**
- Produces: `UPLOAD_DIR` documented and wired; `uploads_data` Docker volume; Vercel limitation documented.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/gallery-config.test.ts
import fs from "fs";

it("documents UPLOAD_DIR", () => {
  expect(fs.readFileSync(".env.example", "utf8")).toMatch(/UPLOAD_DIR/);
  expect(fs.readFileSync("README.md", "utf8")).toMatch(/UPLOAD_DIR/);
});

it("persists uploads in docker compose", () => {
  const compose = fs.readFileSync("docker-compose.yml", "utf8");
  expect(compose).toMatch(/UPLOAD_DIR=\/app\/data\/uploads/);
  expect(compose).toMatch(/uploads_data:\/app\/data\/uploads/);
  expect(compose).toMatch(/uploads_data:/);
});

it("documents the Vercel limitation", () => {
  expect(fs.readFileSync("docs/VERCEL.md", "utf8")).toMatch(/gallery/i);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest __tests__/gallery-config.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the config and docs**

- `.env.example`: under server-only, add `UPLOAD_DIR="./data/uploads"` with a comment that it must be on persistent disk and writable.
- `docker-compose.yml`: add `- UPLOAD_DIR=/app/data/uploads` to the app environment and `- uploads_data:/app/data/uploads` to the app volumes; declare `uploads_data:` next to `postgres_data:`.
- `README.md`: add a gallery feature row and `UPLOAD_DIR` env-table row; note photos need persistent storage.
- `docs/SELF_HOSTING.md`: explain that photos live outside Postgres; back up both `pg_dump` and the `uploads_data` volume; recommend 1 GB RAM with the gallery enabled.
- `docs/VERCEL.md`: state the gallery is not supported there as configured because the filesystem is ephemeral; self-host with the volume instead.

- [ ] **Step 4: Run the full verification**

Run: `npx jest __tests__/gallery-config.test.ts`
Expected: PASS.

Run: `npm test`
Expected: all suites pass.

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: successful production build (requires `DATABASE_URL` reachable at build time only if pages are statically evaluated; gallery page is `force-dynamic`).

- [ ] **Step 5: Commit**

```bash
git add .env.example docker-compose.yml README.md docs/SELF_HOSTING.md docs/VERCEL.md __tests__/gallery-config.test.ts
git commit -m "docs(gallery): document storage, backups, and deployment"
```
