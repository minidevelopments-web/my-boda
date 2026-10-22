"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SUPPORTED_LOCALES, isValidLocale } from "@/i18n/locales";

const NAMES: Record<string, string> = { en: "English", es: "Español", fr: "Français", de: "Deutsch", pt: "Português" };

export function LanguageSwitcher({ lang }: { lang: string }) {
  const pathname = usePathname();
  // Strip only a valid locale prefix; leave invalid/legacy paths untouched
  // so the middleware (not the switcher) decides the redirect target.
  const segs = pathname.split("/");
  const rest =
    segs.length > 1 && isValidLocale(segs[1])
      ? "/" + segs.slice(2).join("/").replace(/\/$/, "") || "/"
      : pathname || "/";
  const normalizedRest = rest.startsWith("/") ? rest : `/${rest}`;
  return (
    <nav aria-label="Language" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {SUPPORTED_LOCALES.map((l) => (
        <Link
          key={l}
          href={`/${l}${normalizedRest === "/" ? "" : normalizedRest}`}
          hrefLang={l}
          aria-current={l === lang ? "page" : undefined}
          className="hover:text-stone-900 aria-[current=page]:font-semibold aria-[current=page]:text-stone-900"
          onClick={() => {
            document.cookie = `locale=${l}; path=/; max-age=31536000; SameSite=Lax`;
          }}
        >
          {NAMES[l]}
        </Link>
      ))}
    </nav>
  );
}
