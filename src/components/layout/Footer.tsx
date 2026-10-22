import Link from "next/link";
import type { Dictionary } from "@/lib/i18n";

export function Footer({ dict, lang }: { dict: Dictionary; lang: string }) {
  const tagline = dict.footer.tagline;
  const credit = dict.footer.credit;
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
          <p className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600">
            <a
              href="https://github.com/minidevelopments-web/my-boda"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline decoration-gray-300 underline-offset-4 hover:decoration-gray-600"
            >
              {credit}
            </a>
            <Link
              href={`/${lang}/pricing`}
              className="underline decoration-gray-300 underline-offset-4 hover:decoration-gray-600"
            >
              {dict.nav.pricing}
            </Link>
          </p>
          <p className="text-sm text-gray-500">{tagline}</p>
        </div>
      </div>
    </footer>
  );
}
