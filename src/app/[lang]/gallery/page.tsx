import Link from "next/link";
import { cookies } from "next/headers";
import InviteGate from "@/components/rsvp/InviteGate";
import { GalleryGrid, type GalleryPhotoView } from "@/components/gallery/GalleryGrid";
import { GalleryUpload } from "@/components/gallery/GalleryUpload";
import { ThemeProvider } from "@/components/theme/ThemeContext";
import { getSiteConfig } from "@/lib/config";
import { getDictionary, type Locale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { resolveGalleryViewer } from "@/lib/gallery/viewer";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 48;

type SearchParams = { page?: string };

export default async function GalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Locale }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { lang } = await params;
  const config = getSiteConfig();
  const dict = getDictionary(lang);
  const cookieStore = await cookies();
  const viewer = await resolveGalleryViewer(
    cookieStore.get("guest_session")?.value,
    cookieStore.get("admin_session")?.value
  );

  const header = (
    <div className="mb-8 text-center">
      <h1 className="font-serif text-4xl font-light tracking-tight">{dict.gallery.title}</h1>
      <p className="mx-auto mt-2 max-w-prose text-sm text-gray-600">{dict.gallery.subtitle}</p>
    </div>
  );

  if (!viewer) {
    return (
      <ThemeProvider config={config}>
        <div className="mx-auto max-w-2xl px-6 py-content">
          {header}
          <InviteGate dict={(dict as unknown as { invite?: Record<string, string> }).invite ?? {}} />
        </div>
      </ThemeProvider>
    );
  }

  const query = searchParams ? await searchParams : {};
  const page = Math.max(parseInt(query.page ?? "1", 10) || 1, 1);
  const [photos, total] = await Promise.all([
    prisma.galleryPhoto.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.galleryPhoto.count(),
  ]);

  const views: GalleryPhotoView[] = photos.map((photo) => ({
    id: photo.id,
    caption: photo.caption,
    uploaderName: photo.uploaderName,
    width: photo.width,
    height: photo.height,
    createdAt: photo.createdAt.toISOString(),
    canDelete:
      viewer.kind === "staff" ||
      (viewer.kind === "guest" && photo.householdId === viewer.householdId),
  }));

  return (
    <ThemeProvider config={config}>
      <div className="mx-auto max-w-5xl px-6 py-content">
        {header}

        {viewer.kind === "guest" && (
          <div className="mb-8">
            <GalleryUpload messages={dict.gallery} />
          </div>
        )}

        <p className="mb-4 text-xs uppercase tracking-widest text-stone-500">
          {dict.gallery.photoCount.replace("{count}", String(total))}
        </p>
        <GalleryGrid photos={views} lang={lang} messages={dict.gallery} />

        {(page > 1 || page * PAGE_SIZE < total) && (
          <div className="mt-6 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link href={`/${lang}/gallery?page=${page - 1}`} className="rounded border px-3 py-1.5 hover:bg-gray-50">
                ← {dict.admin.previous}
              </Link>
            ) : (
              <span />
            )}
            {page * PAGE_SIZE < total && (
              <Link href={`/${lang}/gallery?page=${page + 1}`} className="rounded border px-3 py-1.5 hover:bg-gray-50">
                {dict.admin.next} →
              </Link>
            )}
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}
