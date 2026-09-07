"use client";

import { FC } from "react";
import type { SiteConfig } from "@/lib/config";
import type { Locale } from "@/i18n/locales";
import type { Dictionary } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { useThemeOptional } from "@/components/theme/ThemeContext";
import { getThemeForConfig } from "@/lib/theme/service";

function formatDate(dateStr: string, lang: string): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat(lang, { dateStyle: "long" }).format(d);
  } catch {
    return dateStr;
  }
}

const GardenRomance: FC<{ config: SiteConfig; lang?: Locale; dict?: Dictionary }> = ({ config, lang = "en", dict }) => {
  const ctx = useThemeOptional();
  const tokens = ctx?.tokens ?? getThemeForConfig(config);
  const effectiveConfig = ctx?.config ?? config;
  const dateFormatted = formatDate(effectiveConfig.weddingDate, lang);

  return (
    <div
      style={{ backgroundColor: tokens.colors.background, color: tokens.colors.foreground }}
    >
      {/* Decorative top border — accent via tokens */}
      <div className="h-1 w-full" style={{ backgroundColor: tokens.colors.accent, opacity: 0.6 }} />
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-content text-center md:py-section">
        <div
          className="mx-auto max-w-3xl border border-white bg-white/70 px-8 py-content shadow-[0_8px_40px_rgba(0,0,0,0.04)] backdrop-blur md:px-16"
          style={{ borderRadius: tokens.radius.card }}
        >
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-stone-400">Together with love</p>
          <div className="mt-4 flex items-center justify-center gap-3 text-stone-300">
            <span className="h-px w-12 bg-stone-200" />
            <span className="text-lg">✿</span>
            <span className="h-px w-12 bg-stone-200" />
          </div>
          <h1
            className="mt-6 font-serif text-5xl font-normal leading-none md:text-6xl"
            style={{ fontFamily: tokens.typography.headingFont, color: tokens.colors.accent }}
          >
            {effectiveConfig.coupleName}
          </h1>
          <p className="mt-6 font-serif text-lg italic text-stone-500" style={{ fontFamily: tokens.typography.headingFont }}>
            {dateFormatted}
          </p>
          <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-stone-500 shadow-sm">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tokens.colors.accent }} />
            {effectiveConfig.venue}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {/* Buttons consume theme via context */}
            <Button href={`/${lang}/rsvp`} className="rounded-full px-10 shadow-sm">
              {dict?.nav.rsvp ?? "RSVP"}
            </Button>
            <Button href={`/${lang}/info`} variant="secondary" className="rounded-full border-stone-200 bg-white px-10">
              {dict?.nav.info ?? "Our Story & Info"}
            </Button>
          </div>
          <p className="mt-6 text-xs text-stone-400">Kindly respond — we can&apos;t wait to celebrate with you</p>
        </div>
        {/* floating dots */}
        <div className="pointer-events-none relative hidden md:block">
          <span className="absolute -top-8 left-12 h-2 w-2 rounded-full bg-pink-200/60" />
          <span className="absolute -top-4 right-16 h-3 w-3 rounded-full bg-green-200/50" />
        </div>
      </section>

      {/* Schedule */}
      <section className="mx-auto max-w-5xl px-6 pb-content">
        <div className="bg-white p-8 shadow-sm md:p-12" style={{ borderRadius: tokens.radius.card }}>
          <h2 className="text-center font-serif text-2xl font-light" style={{ fontFamily: tokens.typography.headingFont }}>
            A Garden Celebration
          </h2>
          <p className="mt-2 text-center text-sm text-stone-500">An afternoon among flowers and friends</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { time: "4:00 PM", title: "Ceremony", desc: "Under the olive trees", icon: "♥" },
              { time: "5:30 PM", title: "Garden Cocktails", desc: "Spritz & small bites", icon: "✿" },
              { time: "7:00 PM", title: "Feast & Dance", desc: "Long tables, wildflowers", icon: "♪" },
            ].map((item) => (
              <div
                key={item.title}
                className="border border-stone-100 p-6 text-center"
                style={{ backgroundColor: tokens.colors.cardMuted, borderRadius: tokens.radius.card }}
              >
                <div
                  className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm shadow-sm"
                  style={{ color: tokens.colors.accent }}
                >
                  {item.icon}
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-widest" style={{ color: tokens.colors.accent }}>
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
      </section>

      {/* Map placeholder */}
      <section className="mx-auto max-w-5xl px-6 pb-content">
        <div
          className="overflow-hidden border border-white bg-white shadow-sm"
          style={{ borderRadius: tokens.radius.card }}
        >
          <div className="grid md:grid-cols-[1.1fr_0.9fr]">
            <div
              className="flex h-64 items-center justify-center bg-gradient-to-br from-green-50 to-pink-50 p-6 text-center md:h-auto"
            >
              <div>
                <p className="text-xs uppercase tracking-widest text-stone-400">Find us at</p>
                <p className="mt-1 font-serif text-xl" style={{ fontFamily: tokens.typography.headingFont }}>
                  {effectiveConfig.venue}
                </p>
                <p className="mt-2 text-xs text-stone-400">Map placeholder — see Info for directions</p>
              </div>
            </div>
            <div className="flex h-48 items-center justify-center md:h-64" style={{ backgroundColor: tokens.colors.cardMuted }}>
              <span className="rounded-full border border-dashed border-stone-300 px-6 py-3 text-xs uppercase tracking-widest text-stone-400">
                Map placeholder
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default GardenRomance;
