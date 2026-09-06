type GuestWithRsvp = {
  id: string;
  rsvp?: { attending: boolean } | null;
};

type Labels = {
  totalGuests?: string;
  confirmed?: string;
  declined?: string;
  pending?: string;
};

type Props = {
  guests: GuestWithRsvp[];
  total?: number;
  confirmed?: number;
  declined?: number;
  pending?: number;
  labels?: Labels;
};

const DEFAULT_LABELS: Required<Labels> = {
  totalGuests: "Total Guests",
  confirmed: "Confirmed",
  declined: "Declined",
  pending: "Pending",
};

export function StatsCards({ guests, total: totalProp, confirmed: confirmedProp, declined: declinedProp, pending: pendingProp, labels }: Props) {
  const total = totalProp ?? guests.length;
  const confirmed = confirmedProp ?? guests.filter((g) => g.rsvp?.attending === true).length;
  const declined = declinedProp ?? guests.filter((g) => g.rsvp?.attending === false).length;
  const responded = confirmed + declined;
  const pending = pendingProp ?? total - responded;

  const t = { ...DEFAULT_LABELS, ...labels };
  const cards = [
    { label: t.totalGuests, value: total },
    { label: t.confirmed, value: confirmed },
    { label: t.declined, value: declined },
    { label: t.pending, value: pending },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">{c.label}</p>
          <p className="mt-1 text-2xl font-bold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export default StatsCards;
