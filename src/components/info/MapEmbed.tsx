type Props = {
  venueMapUrl: string;
  venue: string;
};

export function MapEmbed({ venueMapUrl, venue }: Props) {
  if (!venueMapUrl) {
    return (
      <div className="rounded border border-stone-200 bg-stone-50 p-6 text-center">
        <p className="text-sm font-medium text-stone-600">{venue}</p>
        <p className="mt-2 text-xs text-stone-400">
          Map link not configured. Venue details above.
        </p>
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(venue)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm underline hover:text-stone-700"
        >
          Open in Google Maps
        </a>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded border border-stone-200 bg-white shadow-sm">
      <iframe
        src={venueMapUrl}
        title={`Map — ${venue}`}
        className="h-[360px] w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <div className="border-t bg-stone-50 px-4 py-2 text-center">
        <a
          href={venueMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline hover:text-stone-700"
        >
          Open in Google Maps
        </a>
      </div>
    </div>
  );
}
