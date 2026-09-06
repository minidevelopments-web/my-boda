import { getSiteConfig } from "@/lib/config";
import { Schedule } from "@/components/info/Schedule";
import { MapEmbed } from "@/components/info/MapEmbed";
import { AccommodationList } from "@/components/info/AccommodationList";
import { ThemeProvider } from "@/components/theme/ThemeContext";
import { getDictionary, type Locale } from "@/lib/i18n";

export default async function InfoPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const config = getSiteConfig();
  const dict = getDictionary(lang);
  const weddingDate = new Intl.DateTimeFormat(lang, { dateStyle: "long" }).format(
    new Date(config.weddingDate)
  );
  return (
    <ThemeProvider config={config}>
      <div className="mx-auto max-w-5xl px-6 py-content">
        <h1 className="font-serif text-4xl font-light tracking-tight">{dict.info.title}</h1>
        <p className="mt-2 max-w-prose text-sm text-stone-500">
          {config.venue} — {weddingDate}
        </p>

        <section className="mt-10">
          <h2 className="mb-6 text-lg font-semibold">{dict.info.schedule}</h2>
          {/* Schedule now consumes accent via useTheme() — no prop drilling */}
          <Schedule items={config.schedule} emptyMessage={dict.info.emptySchedule} />
        </section>

        <section className="mt-12">
          <h2 className="mb-6 text-lg font-semibold">{dict.info.venue}</h2>
          <MapEmbed venueMapUrl={config.venueMapUrl} venue={config.venue} fallbackNote={dict.info.mapFallback} openLabel={dict.info.openInMaps} />
        </section>

        <section className="mt-12">
          <h2 className="mb-6 text-lg font-semibold">{dict.info.accommodations}</h2>
          <AccommodationList items={config.accommodations} emptyMessage={dict.info.emptyAccommodations} visitLabel={dict.info.visitWebsite} />
        </section>
      </div>
    </ThemeProvider>
  );
}
