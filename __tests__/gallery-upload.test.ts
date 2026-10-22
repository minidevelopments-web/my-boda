/**
 * @jest-environment node
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { createGuestSession } from "@/lib/auth";
import { clearRateLimitStore } from "@/lib/rateLimit";
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
  clearRateLimitStore();
  mockHousehold.mockReset();
  mockCount.mockReset();
  mockCreate.mockReset();
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
