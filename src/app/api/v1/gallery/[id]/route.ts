import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveGalleryViewer } from "@/lib/gallery/viewer";
import { deletePhotoFiles } from "@/lib/gallery/storage";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  if (viewer.kind === "guest" && photo.householdId !== viewer.householdId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.galleryPhoto.delete({ where: { id } });
  await deletePhotoFiles(photo).catch(() => {});

  return new Response(null, { status: 204 });
}
