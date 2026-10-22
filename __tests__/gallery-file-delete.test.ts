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
      : { id: where.id, expiresAt: null, guests: [{ id: "g1", name: "Ana" }] }
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
  expect(ok.headers.get("cache-control")).toContain("no-store");

  expect((await GET(get("p1", "thumb"), params("p1"))).status).toBe(401);
  expect((await GET(get("p1", "huge", `guest_session=${createGuestSession("h1", "g1")}`), params("p1"))).status).toBe(400);
});

it("lets a household delete its own photo and blocks another household", async () => {
  const other = await DELETE(del("p1", `guest_session=${createGuestSession("h2", "g9")}`), params("p1"));
  expect(other.status).toBe(403);
  expect(mockDelete).not.toHaveBeenCalled();
  await expect(fs.access(path.join(dir, photo.fileName))).resolves.toBeUndefined();

  const own = await DELETE(del("p1", `guest_session=${createGuestSession("h1", "g1")}`), params("p1"));
  expect(own.status).toBe(204);
  expect(mockDelete).toHaveBeenCalledWith({ where: { id: "p1" } });
});

it("rejects an expired household but still lets staff use their session", async () => {
  mockFindUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) =>
    where.id === "p1"
      ? { id: "p1", householdId: "h1", ...photo }
      : { id: where.id, expiresAt: new Date(Date.now() - 1000), guests: [{ id: "g1", name: "Ana" }] }
  );

  const expired = await GET(get("p1", "thumb", `guest_session=${createGuestSession("h1", "g1")}`), params("p1"));
  expect(expired.status).toBe(401);

  const staff = await GET(
    get("p1", "thumb", `guest_session=${createGuestSession("h1", "g1")}; admin_session=${createStaffSession("u1", "COUPLE")}`),
    params("p1")
  );
  expect(staff.status).toBe(200);
});

it("lets staff delete any photo", async () => {
  const res = await DELETE(del("p1", `admin_session=${createStaffSession("u1", "COUPLE")}`), params("p1"));
  expect(res.status).toBe(204);
});
