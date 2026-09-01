import type { Accommodation } from "@/lib/config";

export function AccommodationList({ items }: { items: Accommodation[] }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-stone-500">Accommodation details to be announced.</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((acc, idx) => (
        <div key={`${acc.name}-${idx}`} className="rounded border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="font-medium">{acc.name}</h3>
          {acc.note && <p className="mt-1 text-sm text-stone-500">{acc.note}</p>}
          {acc.url && (
            <a
              href={acc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm underline hover:text-stone-700"
            >
              Visit website
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
