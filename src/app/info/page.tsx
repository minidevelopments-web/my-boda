import { getSiteConfig } from "@/lib/config";
import { Schedule } from "@/components/info/Schedule";
import { MapEmbed } from "@/components/info/MapEmbed";
import { AccommodationList } from "@/components/info/AccommodationList";
import { ThemeProvider } from "@/components/theme/ThemeContext";

export default function InfoPage() {
  const config = getSiteConfig();
  return (
    <ThemeProvider config={config}>
      <div className="mx-auto max-w-5xl px-6 py-content">
        <h1 className="font-serif text-3xl font-light">Wedding Info</h1>
        <p className="mt-2 text-sm text-stone-500">
          {config.venue} — {config.weddingDate}
        </p>

        <section className="mt-10">
          <h2 className="mb-6 text-lg font-semibold">Schedule</h2>
          {/* Schedule now consumes accent via useTheme() — no prop drilling */}
          <Schedule items={config.schedule} />
        </section>

        <section className="mt-12">
          <h2 className="mb-6 text-lg font-semibold">Venue</h2>
          <MapEmbed venueMapUrl={config.venueMapUrl} venue={config.venue} />
        </section>

        <section className="mt-12">
          <h2 className="mb-6 text-lg font-semibold">Accommodations</h2>
          <AccommodationList items={config.accommodations} />
        </section>
      </div>
    </ThemeProvider>
  );
}
