import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { parseStaffSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readPhotoFile } from "@/lib/gallery/storage";
import { zipPhotoChunks } from "@/lib/gallery/zip";

export const runtime = "nodejs";

const MAX_ENTRIES = 60_000;
const MAX_BYTES = 3_500_000_000;

export async function GET(req: NextRequest) {
  const session = parseStaffSession(req.cookies.get("admin_session")?.value);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.role !== "COUPLE" && session.role !== "SYSADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const photos = await prisma.galleryPhoto.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, fileName: true, uploaderName: true, createdAt: true, bytes: true },
  });

  const totalBytes = photos.reduce((sum, photo) => sum + photo.bytes, 0);
  if (photos.length > MAX_ENTRIES || totalBytes > MAX_BYTES) {
    return NextResponse.json({ error: "export_too_large" }, { status: 413 });
  }

  const stream = Readable.from(zipPhotoChunks(photos, readPhotoFile));
  const fileName = `wedding-photos-${new Date().toISOString().slice(0, 10)}.zip`;

  return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
