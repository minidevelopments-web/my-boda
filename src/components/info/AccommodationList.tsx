import type { Accommodation } from "@/lib/config";
import { Card } from "@/components/ui/Card";

export function AccommodationList({
  items,
  emptyMessage,
  visitLabel,
}: {
  items: Accommodation[];
  emptyMessage?: string;
  visitLabel?: string;
}) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-stone-500">{emptyMessage ?? "Accommodation details to be announced."}</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((acc, idx) => (
        <Card key={`${acc.name}-${idx}`} className="p-4">
          <h3 className="font-medium">{acc.name}</h3>
          {acc.note && <p className="mt-1 text-sm text-stone-500">{acc.note}</p>}
          {acc.url && (
            <a
              href={acc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm underline hover:text-stone-700"
            >
              {visitLabel ?? "Visit website"}
            </a>
          )}
        </Card>
      ))}
    </div>
  );
}
