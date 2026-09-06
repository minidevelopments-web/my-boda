import { getSiteConfig } from "@/lib/config";
import { Schedule } from "@/components/info/Schedule";
import { MapEmbed } from "@/components/info/MapEmbed";
import { AccommodationList } from "@/components/info/AccommodationList";
import { ThemeProvider } from "@/components/theme/ThemeContext";
import { getDictionary, type Locale } from "@/lib/i18n";

export default function InfoPage({ params }: { params: { lang: Locale } }) {
  const config = getSiteConfig();
  const dict = getDictionary(params.lang);
  return (
    <ThemeProvider config={config}>
      <div className="mx-auto max-w-5xl px-6 py-content">
        <h1 className="font-serif text-4xl font-light tracking-tight">{dict.info.title}</h1>
        <p className="mt-2 max-w-prose text-sm text-stone-500">
          {config.venue} — {config.weddingDate}
        </p>

        <section className="mt-10">
          <h2 className="mb-6 text-lg font-semibold">{dict.info.schedule}</h2>
          {/* Schedule now consumes accent via useTheme() — no prop drilling */}
          <Schedule items={config.schedule} />
        </section>

        <section className="mt-12">
          <h2 className="mb-6 text-lg font-semibold">{dict.info.venue}</h2>
          <MapEmbed venueMapUrl={config.venueMapUrl} venue={config.venue} />
        </section>

        <section className="mt-12">
          <h2 className="mb-6 text-lg font-semibold">{dict.info.accommodations}</h2>
          <AccommodationList items={config.accommodations} />
        </section>
      </div>
    </ThemeProvider>
  );
}
