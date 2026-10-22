import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveGalleryViewer } from "@/lib/gallery/viewer";
import { readPhotoFile } from "@/lib/gallery/storage";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const variant = new URL(req.url).searchParams.get("variant");
  if (variant !== "thumb" && variant !== "full") {
    return NextResponse.json({ error: "invalid_variant" }, { status: 400 });
  }

  const viewer = await resolveGalleryViewer(
    req.cookies.get("guest_session")?.value,
    req.cookies.get("admin_session")?.value
  );
  if (!viewer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const photo = await prisma.galleryPhoto.findUnique({ where: { id } });
  if (!photo) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const data = await readPhotoFile(variant === "thumb" ? photo.thumbName : photo.fileName);
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": photo.mimeType,
      "Content-Length": String(data.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
