"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/i18n";

export type GalleryPhotoView = {
  id: string;
  caption: string | null;
  uploaderName: string;
  width: number;
  height: number;
  createdAt: string;
  canDelete: boolean;
};

type Props = {
  photos: GalleryPhotoView[];
  lang: string;
  messages: Dictionary["gallery"];
};

export function GalleryGrid({ photos, lang, messages }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function remove(id: string) {
    if (!window.confirm(messages.deleteConfirm)) return;
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/gallery/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      router.refresh();
    } catch {
      setError(messages.errors.deleteFailed);
    } finally {
      setDeleting(null);
    }
  }

  if (photos.length === 0) {
    return <p className="rounded border border-dashed px-6 py-12 text-center text-sm text-stone-500">{messages.empty}</p>;
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo) => (
          <li key={photo.id} className="overflow-hidden rounded border bg-white">
            <a
              href={`/api/v1/gallery/${photo.id}/file?variant=full`}
              target="_blank"
              rel="noreferrer"
              className="block aspect-square bg-stone-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- the Next image optimizer cannot forward the auth cookie */}
              <img
                src={`/api/v1/gallery/${photo.id}/file?variant=thumb`}
                alt={photo.caption || photo.uploaderName}
                loading="lazy"
                width={photo.width}
                height={photo.height}
                className="h-full w-full object-cover"
              />
            </a>
            <div className="space-y-1 p-3 text-xs">
              {photo.caption && <p className="font-medium text-stone-800">{photo.caption}</p>}
              <p className="text-stone-500">
                {photo.uploaderName} · {new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(new Date(photo.createdAt))}
              </p>
              {photo.canDelete && (
                <button
                  type="button"
                  onClick={() => remove(photo.id)}
                  disabled={deleting === photo.id}
                  className="text-[11px] font-medium text-red-600 underline disabled:opacity-50"
                >
                  {messages.delete}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
