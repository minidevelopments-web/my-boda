import Link from "next/link";
import RsvpForm from "@/components/rsvp/RsvpForm";
import { getSiteConfig } from "@/lib/config";
import { getDictionary, type Locale } from "@/lib/i18n";

export default async function RsvpPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const config = getSiteConfig();
  const dict = getDictionary(lang);
  const weddingDate = new Intl.DateTimeFormat(lang, { dateStyle: "long" }).format(
    new Date(config.weddingDate)
  );
  return (
    <div className="mx-auto max-w-2xl px-6 py-content">
      <div className="mb-8 text-center">
        <h1 className="font-serif text-4xl font-light tracking-tight">{dict.rsvp.title}</h1>
        <p className="mx-auto mt-2 max-w-prose text-sm text-gray-600">
          {dict.rsvp.celebrateWith
            .replace("{couple}", config.coupleName)
            .replace("{venue}", config.venue)
            .replace("{date}", weddingDate)}
        </p>
        <p className="mx-auto mt-1 max-w-prose text-sm text-gray-500">{dict.rsvp.subtitle}</p>
      </div>

      <RsvpForm messages={dict.rsvp} />

      <div className="mt-8 text-center">
        <Link href={`/${lang}`} className="text-sm font-medium text-gray-600 hover:text-black underline">
          ← {dict.rsvp.backHome}
        </Link>
      </div>
    </div>
  );
}
