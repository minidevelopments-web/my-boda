"use client";

import { FC } from "react";
import { format, parseISO, isValid } from "date-fns";
import { Playfair_Display, Inter } from "next/font/google";
import type { SiteConfig } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { useThemeOptional } from "@/components/theme/ThemeContext";
import { getThemeForConfig } from "@/lib/theme/service";

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

function formatDate(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, "EEEE, MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}

const ClassicElegance: FC<{ config: SiteConfig }> = ({ config }) => {
  const ctx = useThemeOptional();
  const tokens = ctx?.tokens ?? getThemeForConfig(config);
  const effectiveConfig = ctx?.config ?? config;
  const dateFormatted = formatDate(effectiveConfig.weddingDate);

  return (
    <div
      className={`${playfair.variable} ${inter.variable}`}
      style={{
        backgroundColor: tokens.colors.background,
        color: tokens.colors.foreground,
      }}
    >
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-24 text-center md:py-32">
        <p
          className="mb-6 text-xs font-medium uppercase tracking-[0.3em] text-stone-500"
          style={{ color: tokens.colors.accent }}
        >
          — You are cordially invited —
        </p>
        <h1
          className="font-serif text-5xl font-light tracking-tight md:text-7xl"
          style={{ fontFamily: tokens.typography.headingFont }}
        >
          {effectiveConfig.coupleName}
        </h1>
        <div className="mx-auto my-8 flex max-w-md items-center justify-center gap-4">
          <span className="h-px flex-1 bg-stone-200" />
          <span
            className="h-2 w-2 rotate-45 border"
            style={{ borderColor: tokens.colors.accent, backgroundColor: tokens.colors.accentMuted }}
          />
          <span className="h-px flex-1 bg-stone-200" />
        </div>
        <p className="font-serif text-lg italic text-stone-600" style={{ fontFamily: tokens.typography.headingFont }}>
          {dateFormatted}
        </p>
        <p className="mt-2 text-sm uppercase tracking-widest text-stone-500">{effectiveConfig.venue}</p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {/* Button consumes accent via useTheme hook — no prop drilling */}
          <Button href="/rsvp" className="rounded-none border border-transparent px-10">
            RSVP
          </Button>
          <Button href="/info" variant="secondary" className="rounded-none border-stone-300 px-10">
            Details
          </Button>
        </div>
      </section>

      {/* Schedule */}
      <section className="border-t bg-white/60" style={{ borderColor: tokens.colors.border }}>
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2
            className="text-center font-serif text-3xl font-light tracking-wide"
            style={{ fontFamily: tokens.typography.headingFont }}
          >
            Schedule
          </h2>
          <div className="mx-auto mt-10 max-w-2xl">
            <div className="relative border-l pl-8" style={{ borderColor: tokens.colors.border }}>
              {[
                { time: "4:00 PM", title: "Ceremony", desc: "Join us as we say “I do”" },
                { time: "5:30 PM", title: "Cocktail Hour", desc: "Drinks & hors d’oeuvres on the terrace" },
                { time: "7:00 PM", title: "Reception", desc: "Dinner, dancing & celebration" },
              ].map((item) => (
                <div key={item.title} className="relative mb-10 last:mb-0">
                  <span
                    className="absolute -left-[9px] top-1 h-2 w-2 rotate-45 border bg-white"
                    style={{ borderColor: tokens.colors.accent }}
                  />
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: tokens.colors.accent }}>
                    {item.time}
                  </p>
                  <h3 className="mt-1 font-serif text-lg" style={{ fontFamily: tokens.typography.headingFont }}>
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-stone-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Map placeholder */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="rounded-none border bg-white p-2 shadow-sm" style={{ borderColor: tokens.colors.border }}>
          <div className="flex h-64 items-center justify-center text-center" style={{ backgroundColor: tokens.colors.background }}>
            <div>
              <p className="text-sm font-medium uppercase tracking-widest text-stone-400">Venue</p>
              <p className="mt-1 font-serif text-lg" style={{ fontFamily: tokens.typography.headingFont }}>
                {effectiveConfig.venue}
              </p>
              <p className="mt-2 text-xs text-stone-400">Map placeholder — venue details on Info page</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ClassicElegance;
