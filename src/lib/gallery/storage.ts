import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

import {
  FULL_MAX_EDGE,
  MAX_CAPTION_LENGTH,
  MAX_FILE_BYTES,
  MAX_FILES_PER_UPLOAD,
  MAX_PHOTOS_PER_HOUSEHOLD,
  THUMB_MAX_EDGE,
} from "./limits";

export {
  FULL_MAX_EDGE,
  MAX_CAPTION_LENGTH,
  MAX_FILE_BYTES,
  MAX_FILES_PER_UPLOAD,
  MAX_PHOTOS_PER_HOUSEHOLD,
  THUMB_MAX_EDGE,
};

export type StoredPhoto = {
  fileName: string;
  thumbName: string;
  mimeType: "image/jpeg";
  width: number;
  height: number;
  bytes: number;
};

export function getUploadRoot(): string {
  return path.resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR || "./data/uploads");
}

function photoPath(fileName: string): string {
  if (!fileName || fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
    throw new Error("Invalid photo file name");
  }
  const root = getUploadRoot();
  const resolved = path.resolve(root, fileName);
  if (path.dirname(resolved) !== root) {
    throw new Error("Invalid photo file name");
  }
  return resolved;
}

const MAX_CONCURRENCY = 2;
let activeJobs = 0;
const waiting: Array<() => void> = [];

// shortcut: process-local queue assumes one container; replace with a real queue if scaled out.
async function runWithImageSlot<T>(job: () => Promise<T>): Promise<T> {
  if (activeJobs >= MAX_CONCURRENCY) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  activeJobs += 1;
  try {
    return await job();
  } finally {
    activeJobs -= 1;
    waiting.shift()?.();
  }
}

export async function processAndStore(id: string, input: Buffer): Promise<StoredPhoto> {
  return runWithImageSlot(async () => {
    const base = sharp(input, { limitInputPixels: 80_000_000 }).rotate();
    const [full, thumb] = await Promise.all([
      base
        .clone()
        .resize({ width: FULL_MAX_EDGE, height: FULL_MAX_EDGE, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer(),
      base
        .clone()
        .resize({ width: THUMB_MAX_EDGE, height: THUMB_MAX_EDGE, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer(),
    ]);

    const meta = await sharp(full).metadata();
    if (!meta.width || !meta.height) {
      throw new Error("Could not read image dimensions");
    }

    const fileName = `${id}.jpg`;
    const thumbName = `${id}.thumb.jpg`;
    const fullPath = photoPath(fileName);
    const thumbPath = photoPath(thumbName);

    await fs.mkdir(/* turbopackIgnore: true */ getUploadRoot(), { recursive: true });
    await Promise.all([
      fs.writeFile(/* turbopackIgnore: true */ fullPath, full),
      fs.writeFile(/* turbopackIgnore: true */ thumbPath, thumb),
    ]);

    return {
      fileName,
      thumbName,
      mimeType: "image/jpeg",
      width: meta.width,
      height: meta.height,
      bytes: full.length,
    };
  });
}

export async function readPhotoFile(fileName: string): Promise<Buffer | null> {
  const filePath = photoPath(fileName);
  try {
    return await fs.readFile(/* turbopackIgnore: true */ filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function deletePhotoFiles(photo: { fileName: string; thumbName: string }): Promise<void> {
  await Promise.all([
    fs.unlink(/* turbopackIgnore: true */ photoPath(photo.fileName)).catch(() => {}),
    fs.unlink(/* turbopackIgnore: true */ photoPath(photo.thumbName)).catch(() => {}),
  ]);
}
