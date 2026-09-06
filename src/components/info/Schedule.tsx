"use client";

import type { ScheduleItem } from "@/lib/config";
import { useThemeOptional } from "@/components/theme/ThemeContext";

export function Schedule({
  items,
  accentColor,
  emptyMessage,
}: {
  items: ScheduleItem[];
  accentColor?: string;
  emptyMessage?: string;
}) {
  const themeCtx = useThemeOptional();
  const resolvedAccent = accentColor ?? themeCtx?.tokens.colors.accent ?? "#b48a78";
  if (!items || items.length === 0) {
    return <p className="text-sm text-stone-500">{emptyMessage ?? "Schedule to be announced."}</p>;
  }
  return (
    <ul className="relative border-l border-stone-200 pl-8">
      {items.map((item, idx) => (
        <li key={`${item.title}-${idx}`} className="relative mb-10 last:mb-0">
          <span
            aria-hidden="true"
            className="absolute -left-[9px] top-1 h-2 w-2 rotate-45 border bg-white"
            style={{ borderColor: resolvedAccent }}
          />
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: resolvedAccent }}
          >
            {item.time}
          </p>
          <h3 className="mt-1 font-serif text-lg">{item.title}</h3>
          {item.description && <p className="mt-1 text-sm text-stone-500">{item.description}</p>}
        </li>
      ))}
    </ul>
  );
}
