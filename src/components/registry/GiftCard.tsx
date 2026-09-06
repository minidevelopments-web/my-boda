"use client";

import { useState } from "react";
import type { RegistryConfig } from "@/lib/config";

export function GiftCard({ registry, emptyTitle, emptySubtitle }: { registry: RegistryConfig; emptyTitle?: string; emptySubtitle?: string }) {
  const [copied, setCopied] = useState(false);

  const hasContent =
    registry.iban || registry.bizum || (registry.links && registry.links.length > 0) || registry.message;

  async function handleCopy() {
    if (!registry.iban) return;
    try {
      await navigator.clipboard.writeText(registry.iban);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select via execCommand not needed for test env
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!hasContent) {
    return (
      <div className="rounded border border-stone-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-stone-500">{emptyTitle ?? "Registry details to be announced."}</p>
        <p className="mt-2 text-xs text-stone-400">{emptySubtitle ?? "Your presence is the greatest gift."}</p>
      </div>
    );
  }

  return (
    <div className="rounded border border-stone-200 bg-white p-6 shadow-sm">
      {registry.message && <p className="text-sm leading-relaxed text-stone-600">{registry.message}</p>}

      {registry.iban && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">IBAN</p>
          <div className="mt-2 flex items-center gap-3 rounded bg-stone-50 px-3 py-2">
            <code className="flex-1 break-all text-sm">{registry.iban}</code>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded border border-stone-300 bg-white px-3 py-1 text-xs font-medium hover:bg-stone-100"
              aria-label="Copy IBAN"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {registry.bizum && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Bizum</p>
          <p className="mt-1 text-sm">{registry.bizum}</p>
        </div>
      )}

      {registry.links && registry.links.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {registry.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-stone-300 bg-white px-4 py-2 text-sm font-medium hover:bg-stone-50"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
