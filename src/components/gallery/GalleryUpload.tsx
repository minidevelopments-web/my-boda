"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/i18n";
import { MAX_CAPTION_LENGTH, MAX_FILES_PER_UPLOAD } from "@/lib/gallery/limits";

type UploadStatus = "ready" | "preparing" | "uploading" | "done" | "error";

type Item = {
  id: string;
  file: File;
  preview: string;
  status: UploadStatus;
};

type Props = {
  messages: Dictionary["gallery"];
};

const MAX_EDGE = 2048;

export async function resizeForUpload(file: File): Promise<Blob | File> {
  if (typeof createImageBitmap !== "function") return file;
  try {
    // shortcut: browser resize relies on createImageBitmap; unsupported formats (HEIC in Chrome) fall back to the original upload.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    );
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function errorMessage(code: string | undefined, messages: Dictionary["gallery"]): string {
  switch (code) {
    case "no_files":
      return messages.errors.noFiles;
    case "too_many_files":
      return messages.errors.tooMany;
    case "too_large":
    case "payload_too_large":
      return messages.errors.tooLarge;
    case "invalid_image":
      return messages.errors.invalidType;
    case "quota_exceeded":
      return messages.errors.quota;
    case "rate_limited":
      return messages.errors.rateLimited;
    default:
      return messages.errors.uploadFailed;
  }
}

export function GalleryUpload({ messages }: Props) {
  const router = useRouter();
  const inputId = useId();
  const counter = useRef(0);
  const [items, setItems] = useState<Item[]>([]);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function setStatus(ids: string[], status: UploadStatus) {
    setItems((prev) => prev.map((item) => (ids.includes(item.id) ? { ...item, status } : item)));
  }

  function onSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const next = files.map((file) => ({
      id: `f${++counter.current}`,
      file,
      preview: URL.createObjectURL(file),
      status: "ready" as UploadStatus,
    }));
    setItems((prev) => [...prev, ...next]);
    event.target.value = "";
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((item) => item.id !== id);
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (items.length === 0) {
      setError(messages.errors.noFiles);
      return;
    }

    setError(null);
    setUploading(true);
    const snapshot = items;
    let anySuccess = false;
    let failed = false;

    try {
      for (let start = 0; start < snapshot.length; start += MAX_FILES_PER_UPLOAD) {
        const chunk = snapshot.slice(start, start + MAX_FILES_PER_UPLOAD);
        const ids = chunk.map((item) => item.id);
        setStatus(ids, "preparing");

        const form = new FormData();
        for (const item of chunk) {
          form.append("files", await resizeForUpload(item.file), item.file.name);
        }
        if (caption.trim()) form.append("caption", caption.trim());

        setStatus(ids, "uploading");
        const res = await fetch("/api/v1/gallery", { method: "POST", body: form });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          errors?: string[];
        };

        if (!res.ok) {
          setStatus(ids, "error");
          setError(errorMessage(body.error ?? body.errors?.[0], messages));
          failed = true;
          break;
        }
        if (body.errors && body.errors.length > 0) {
          setStatus(ids, "error");
          setError(errorMessage(body.errors[0], messages));
          failed = true;
        } else {
          setStatus(ids, "done");
          anySuccess = true;
        }
      }
    } finally {
      setUploading(false);
    }

    if (anySuccess) router.refresh();
    if (!failed) {
      snapshot.forEach((item) => URL.revokeObjectURL(item.preview));
      setItems([]);
      setCaption("");
    }
  }

  return (
    <form onSubmit={submit} className="rounded border bg-white p-4">
      <h2 className="text-sm font-semibold">{messages.uploadTitle}</h2>
      <p className="mt-1 text-xs text-stone-500">{messages.subtitle}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label
          htmlFor={inputId}
          className="cursor-pointer rounded border px-4 py-2 text-sm font-medium hover:bg-stone-50"
        >
          {messages.chooseFiles}
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          onChange={onSelect}
          disabled={uploading}
          className="sr-only"
        />
        <input
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          maxLength={MAX_CAPTION_LENGTH}
          placeholder={messages.captionPlaceholder}
          aria-label={messages.caption}
          className="min-w-0 flex-1 rounded border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={uploading || items.length === 0}
          className="rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {uploading ? messages.uploading : messages.upload}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {items.length > 0 && (
        <ul aria-live="polite" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <li key={item.id} className="overflow-hidden rounded border text-xs">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
              <img src={item.preview} alt="" className="aspect-square w-full object-cover" />
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="truncate text-stone-500">
                  {item.status === "preparing" && messages.preparing}
                  {item.status === "uploading" && messages.uploading}
                  {item.status === "done" && messages.done}
                  {item.status === "error" && messages.errors.uploadFailed}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  disabled={uploading}
                  className="text-red-600 underline disabled:opacity-50"
                >
                  {messages.delete}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
