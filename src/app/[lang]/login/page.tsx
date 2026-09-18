"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getDictionary, isValidLocale } from "@/lib/i18n";

function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const seg = (pathname ?? "").split("/").filter(Boolean)[0];
  const lang = seg && isValidLocale(seg) ? seg : "en";
  const t = getDictionary(lang).admin;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    fetch("/api/v1/admin/setup").then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (data.needsSetup) setNeedsSetup(true);
    }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push(safeNext(searchParams.get("next")) ?? `/${lang}/admin`);
        router.refresh();
      } else {
        setError(t.invalidPassword);
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
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          aria-label="Email"
          required
        />
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
      {needsSetup && (
        <p className="mt-4 text-sm text-gray-600">
          First time here? <a href={`/${lang}/setup`} className="underline">Set up your wedding</a>
        </p>
      )}
    </div>
  );
}
