/**
 * @jest-environment node
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { NextRequest } from "next/server";
import { createStaffSession } from "@/lib/auth";
import { GET } from "@/app/api/v1/admin/gallery/export/route";

const mockFindMany = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: { galleryPhoto: { findMany: (...args: unknown[]) => mockFindMany(...args) } },
}));

let dir: string;
const request = (cookie?: string) =>
  new NextRequest("http://localhost/api/v1/admin/gallery/export", {
    headers: cookie ? { cookie } : {},
  });
const as = (role: string) => `admin_session=${createStaffSession("u1", role)}`;

beforeEach(async () => {
  process.env.ADMIN_PASSWORD = "secret";
  process.env.UPLOAD_DIR = dir = await fs.mkdtemp(path.join(os.tmpdir(), "gallery-export-"));
  await fs.writeFile(path.join(dir, "aaaaaaaa1.jpg"), Buffer.from("photo-one"));
  await fs.writeFile(path.join(dir, "bbbbbbbb2.jpg"), Buffer.from("photo-two"));
  mockFindMany.mockReset();
  mockFindMany.mockResolvedValue([
    { id: "aaaaaaaa1", fileName: "aaaaaaaa1.jpg", uploaderName: "Ana", createdAt: new Date("2027-06-12T18:00:00Z"), bytes: 9 },
    { id: "bbbbbbbb2", fileName: "bbbbbbbb2.jpg", uploaderName: "Sam", createdAt: new Date("2027-06-12T18:01:00Z"), bytes: 9 },
  ]);
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
  delete process.env.UPLOAD_DIR;
});

it("rejects anonymous callers and planners", async () => {
  expect((await GET(request())).status).toBe(401);
  expect((await GET(request(as("PLANNER")))).status).toBe(403);
});

it("returns a ZIP attachment to the couple and the sysadmin", async () => {
  for (const role of ["COUPLE", "SYSADMIN"]) {
    const res = await GET(request(as(role)));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename="wedding-photos-\d{4}-\d{2}-\d{2}\.zip"/);

    const body = Buffer.from(await res.arrayBuffer());
    expect(body.readUInt32LE(0)).toBe(0x04034b50);
    const eocd = body.length - 22;
    expect(body.readUInt32LE(eocd)).toBe(0x06054b50);
    expect(body.readUInt16LE(eocd + 10)).toBe(2);
  }
});

it("refuses an export that would exceed ZIP32 limits", async () => {
  mockFindMany.mockResolvedValue([
    { id: "huge", fileName: "huge.jpg", uploaderName: "Ana", createdAt: new Date(), bytes: 4_000_000_000 },
  ]);
  expect((await GET(request(as("COUPLE")))).status).toBe(413);
});

it("returns a valid empty ZIP when there are no photos", async () => {
  mockFindMany.mockResolvedValue([]);
  const res = await GET(request(as("COUPLE")));
  expect(res.status).toBe(200);
  const body = Buffer.from(await res.arrayBuffer());
  expect(body.length).toBe(22);
  expect(body.readUInt32LE(0)).toBe(0x06054b50);
});
