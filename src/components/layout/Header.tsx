"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSiteConfig } from "@/lib/config";
import type { Dictionary } from "@/lib/i18n";
import { SELF_HOST_URL } from "@/lib/pricing";
import { LanguageSwitcher } from "./LanguageSwitcher";

type HeaderProps = {
  config?: ReturnType<typeof getSiteConfig>;
  lang: string;
  dict: Dictionary;
};

export function Header({ config, lang, dict }: HeaderProps) {
  // Allow prop or fallback to env via getSiteConfig for standalone usage
  // (client-safe: getSiteConfig only reads NEXT_PUBLIC_* env, inlined at build)
  const cfg = config ?? getSiteConfig();
  const pathname = usePathname();
  const rest = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";

  // Pricing is the product page, not the couple's wedding site: keep the
  // couple nav (RSVP/Info/Registry) out of it and link to my-boda instead.
  if (rest === "/pricing") {
    const pricingNav = dict.pricing.nav;
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3">
          <Link href={`/${lang}/pricing`} className="text-lg font-semibold tracking-tight">
            my-boda
          </Link>
          <nav aria-label="Primary" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium">
            <Link href={`/${lang}/pricing#couples`} className="hidden transition-colors hover:text-stone-600 sm:inline">
              {pricingNav.couples}
            </Link>
            <Link href={`/${lang}/pricing#business`} className="hidden transition-colors hover:text-stone-600 sm:inline">
              {pricingNav.business}
            </Link>
            <Link href={`/${lang}/pricing#compare`} className="hidden transition-colors hover:text-stone-600 lg:inline">
              {pricingNav.compare}
            </Link>
            <Link href={`/${lang}/pricing#faq`} className="hidden transition-colors hover:text-stone-600 lg:inline">
              {pricingNav.faq}
            </Link>
            <a
              href={SELF_HOST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-stone-600"
            >
              GitHub
            </a>
            <LanguageSwitcher lang={lang} />
          </nav>
        </div>
      </header>
    );
  }

  const nav = dict.nav;
  const NAV_LINKS = [
    { path: "/", href: `/${lang}`, label: nav.home },
    { path: "/rsvp", href: `/${lang}/rsvp`, label: nav.rsvp },
    { path: "/info", href: `/${lang}/info`, label: nav.info },
    { path: "/gallery", href: `/${lang}/gallery`, label: nav.photos },
    { path: "/registry", href: `/${lang}/registry`, label: nav.registry },
  ];
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href={`/${lang}`} className="text-lg font-semibold tracking-tight">
          {cfg.coupleName}
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-6 text-sm font-medium">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={rest === link.path ? "page" : undefined}
              className="transition-colors hover:text-gray-600"
            >
              {link.label}
            </Link>
          ))}
          <LanguageSwitcher lang={lang} />
        </nav>
      </div>
    </header>
  );
}
