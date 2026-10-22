import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { resolveGalleryViewer } from "@/lib/gallery/viewer";
import {
  MAX_CAPTION_LENGTH,
  MAX_FILES_PER_UPLOAD,
  MAX_FILE_BYTES,
  MAX_PHOTOS_PER_HOUSEHOLD,
  processAndStore,
  deletePhotoFiles,
} from "@/lib/gallery/storage";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 32 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const viewer = await resolveGalleryViewer(
    req.cookies.get("guest_session")?.value,
    req.cookies.get("admin_session")?.value
  );
  if (!viewer || viewer.kind !== "guest") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  const limit = checkRateLimit(`gallery:${viewer.householdId}`, {
    maxAttempts: 10,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "no_files" }, { status: 400 });
  }
  if (files.length > MAX_FILES_PER_UPLOAD) {
    return NextResponse.json({ error: "too_many_files" }, { status: 400 });
  }

  const rawCaption = typeof form.get("caption") === "string" ? String(form.get("caption")).trim() : "";
  if (rawCaption.length > MAX_CAPTION_LENGTH) {
    return NextResponse.json({ error: "caption_too_long" }, { status: 400 });
  }
  const caption = rawCaption || null;

  const existing = await prisma.galleryPhoto.count({ where: { householdId: viewer.householdId } });
  if (existing + files.length > MAX_PHOTOS_PER_HOUSEHOLD) {
    return NextResponse.json({ error: "quota_exceeded" }, { status: 400 });
  }

  const created: unknown[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      errors.push("too_large");
      continue;
    }

    const id = crypto.randomUUID();
    try {
      const stored = await processAndStore(id, Buffer.from(await file.arrayBuffer()));
      const photo = await prisma.galleryPhoto.create({
        data: {
          id,
          householdId: viewer.householdId,
          guestId: viewer.guestId,
          uploaderName: viewer.name,
          caption,
          ...stored,
        },
      });
      created.push(photo);
    } catch {
      await deletePhotoFiles({ fileName: `${id}.jpg`, thumbName: `${id}.thumb.jpg` });
      errors.push("invalid_image");
    }
  }

  if (created.length === 0) {
    return NextResponse.json({ error: "no_photos_uploaded", errors }, { status: 400 });
  }

  return NextResponse.json(
    { data: created, ...(errors.length ? { errors } : {}) },
    { status: 201 }
  );
}
