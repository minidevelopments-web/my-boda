import type { ScheduleItem } from "@/lib/config";

export function Schedule({
  items,
  accentColor,
}: {
  items: ScheduleItem[];
  accentColor?: string;
}) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-stone-500">Schedule to be announced.</p>;
  }
  return (
    <div className="relative border-l border-stone-200 pl-8">
      {items.map((item, idx) => (
        <div key={`${item.title}-${idx}`} className="relative mb-10 last:mb-0">
          <span
            className="absolute -left-[9px] top-1 h-2 w-2 rotate-45 border bg-white"
            style={{ borderColor: accentColor || "#b48a78" }}
          />
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: accentColor || "#b48a78" }}
          >
            {item.time}
          </p>
          <h3 className="mt-1 font-serif text-lg">{item.title}</h3>
          {item.description && <p className="mt-1 text-sm text-stone-500">{item.description}</p>}
        </div>
      ))}
    </div>
  );
}
