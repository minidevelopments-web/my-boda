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
  })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Copyright: "gallery-test" } } })
    .toBuffer();
  expect((await sharp(input).metadata()).exif).toBeDefined();

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
