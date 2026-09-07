"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  allLabel?: string;
  categoryLabels?: Record<string, string>;
};

const categories = ["all", "family", "friends", "colleagues", "other"] as const;

export function CategoryFilter({ value, onChange, label = "Filter by category", allLabel = "All categories", categoryLabels }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="rounded border px-3 py-2 text-sm"
    >
      {categories.map((c) => (
        <option key={c} value={c}>
          {c === "all" ? allLabel : (categoryLabels?.[c] ?? c)}
        </option>
      ))}
    </select>
  );
}

export default CategoryFilter;
