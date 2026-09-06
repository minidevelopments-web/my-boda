"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SUPPORTED_LOCALES } from "@/i18n/locales";

const NAMES: Record<string, string> = { en: "English", es: "Español", fr: "Français", de: "Deutsch", pt: "Português" };

export function LanguageSwitcher({ lang }: { lang: string }) {
  const pathname = usePathname();
  const rest = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
  return (
    <nav aria-label="Language">
      {SUPPORTED_LOCALES.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest}`}
          hrefLang={l}
          aria-current={l === lang ? "true" : undefined}
          onClick={() => {
            document.cookie = `locale=${l}; path=/; max-age=31536000`;
          }}
        >
          {NAMES[l]}
        </Link>
      ))}
    </nav>
  );
}
