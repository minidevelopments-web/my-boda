"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSiteConfig } from "@/lib/config";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/i18n/locales";

type HeaderProps = {
  config?: ReturnType<typeof getSiteConfig>;
  lang?: Locale;
  dict?: Dictionary;
};

export function Header({ config, lang = "en", dict }: HeaderProps = {}) {
  // Allow prop or fallback to env via getSiteConfig for standalone usage
  // (client-safe: getSiteConfig only reads NEXT_PUBLIC_* env, inlined at build)
  const cfg = config ?? getSiteConfig();
  const pathname = usePathname();
  const nav = dict?.nav ?? { home: "Home", rsvp: "RSVP", info: "Info", registry: "Registry" };
  const NAV_LINKS = [
    { href: `/${lang}`, label: nav.home },
    { href: `/${lang}/rsvp`, label: nav.rsvp },
    { href: `/${lang}/info`, label: nav.info },
    { href: `/${lang}/registry`, label: nav.registry },
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
              aria-current={pathname === link.href ? "page" : undefined}
              className="transition-colors hover:text-gray-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
