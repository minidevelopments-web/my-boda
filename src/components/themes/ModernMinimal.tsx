"use client";

import { FC } from "react";
import { format, parseISO, isValid } from "date-fns";
import type { SiteConfig } from "@/lib/config";
import type { Locale } from "@/i18n/locales";
import type { Dictionary } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { useThemeOptional } from "@/components/theme/ThemeContext";
import { getThemeForConfig } from "@/lib/theme/service";

function formatDate(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, "MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}

const ModernMinimal: FC<{ config: SiteConfig; lang?: Locale; dict?: Dictionary }> = ({ config, lang = "en", dict }) => {
  const ctx = useThemeOptional();
  const tokens = ctx?.tokens ?? getThemeForConfig(config);
  const effectiveConfig = ctx?.config ?? config;
  const dateFormatted = formatDate(effectiveConfig.weddingDate);

  return (
    <div
      className="antialiased"
      style={{ backgroundColor: tokens.colors.background, color: tokens.colors.foreground }}
    >
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-content md:py-section">
        <div className="grid gap-12 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              <span className="h-px w-8 bg-zinc-300" /> {dateFormatted}
            </p>
            <h1
              className="font-serif text-5xl font-black uppercase leading-[0.9] tracking-tighter md:text-7xl"
              style={{ fontFamily: tokens.typography.headingFont }}
            >
              {effectiveConfig.coupleName.split(/ & | and /i).map((part, i, arr) => (
                <span key={i} className="block">
                  {part.trim()}
                  {i < arr.length - 1 && <span className="font-light text-zinc-400"> &</span>}
                </span>
              ))}
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-zinc-500">
              {effectiveConfig.venue} — Save the date. Join us for a modern celebration.
            </p>
            <div className="mt-8 flex gap-3">
              {/* Accent consumed via context — no prop needed */}
              <Button href={`/${lang}/rsvp`} className="rounded-none bg-zinc-900 px-8 text-white hover:bg-zinc-800">
                {dict?.nav.rsvp ?? "RSVP"} →
              </Button>
              <Button href={`/${lang}/info`} variant="secondary" className="rounded-none border-zinc-900 px-8">
                {dict?.nav.info ?? "Info"}
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/3] border bg-zinc-50 p-6" style={{ borderColor: tokens.colors.border }}>
              <div className="flex h-full flex-col justify-between">
                <div className="flex justify-between text-[10px] uppercase tracking-widest text-zinc-400">
                  <span>Invitation</span>
                  <span>No. 001</span>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black uppercase tracking-tighter">{effectiveConfig.coupleName}</p>
                  <p className="mt-2 text-xs uppercase tracking-widest text-zinc-500">{dateFormatted}</p>
                </div>
                <div className="h-px w-full bg-zinc-200" />
                <p className="text-center text-xs uppercase tracking-widest text-zinc-400">{effectiveConfig.venue}</p>
              </div>
            </div>
            <div className="absolute -bottom-3 -right-3 h-24 w-24 border bg-white -z-10 hidden md:block" style={{ borderColor: tokens.colors.border }} />
          </div>
        </div>
      </section>

      {/* Schedule */}
      <section className="border-y bg-zinc-50" style={{ borderColor: tokens.colors.border }}>
        <div className="mx-auto max-w-6xl px-6 py-content">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em]">Schedule</h2>
            <span className="text-xs uppercase tracking-widest text-zinc-400">3 events</span>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { time: "16:00", title: "Ceremony", desc: "Vows & rings" },
              { time: "17:30", title: "Cocktail", desc: "Drinks on the terrace" },
              { time: "19:00", title: "Reception", desc: "Dinner & party" },
            ].map((item) => (
              <div key={item.title} className="border bg-white p-6" style={{ borderColor: tokens.colors.border }}>
                <p className="text-xs font-mono text-zinc-500">{item.time}</p>
                <h3 className="mt-2 text-base font-semibold uppercase tracking-tight">{item.title}</h3>
                <p className="mt-1 text-sm text-zinc-500">{item.desc}</p>
                <div className="mt-4 h-1 w-8" style={{ backgroundColor: tokens.colors.accent }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Map placeholder */}
      <section className="mx-auto max-w-6xl px-6 py-content">
        <div className="grid gap-6 md:grid-cols-[1fr_1.5fr]">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest">Venue</h3>
            <p className="mt-2 text-lg font-medium">{effectiveConfig.venue}</p>
            <p className="mt-2 text-sm text-zinc-500">Directions and map on the Info page. Minimal placeholder for MVP.</p>
          </div>
          <div className="flex h-56 items-center justify-center border border-dashed bg-zinc-50" style={{ borderColor: tokens.colors.border }}>
            <span className="text-xs uppercase tracking-widest text-zinc-400">Map placeholder</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ModernMinimal;
