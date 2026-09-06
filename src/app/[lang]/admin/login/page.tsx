"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getDictionary, isValidLocale } from "@/lib/i18n";

export default function AdminLoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  // Derive locale from /{lang}/admin/login so post-login lands on the same locale
  const seg = (pathname ?? "").split("/").filter(Boolean)[0];
  const lang = seg && isValidLocale(seg) ? seg : "en";
  const t = getDictionary(lang).admin;
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push(`/${lang}/admin`);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t.invalidPassword);
      }
    } catch {
      setError(t.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-6 py-12">
      <h1 className="mb-2 text-2xl font-bold">{t.loginTitle}</h1>
      <p className="mb-6 text-sm text-gray-600">{t.loginSubtitle}</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="password"
          placeholder={t.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          aria-label={t.password}
        />
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? t.signingIn : t.signIn}
        </button>
      </form>
    </div>
  );
}
