"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

const categories = ["all", "family", "friends", "colleagues", "other"] as const;

export function CategoryFilter({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Filter by category"
      className="rounded border px-3 py-2 text-sm"
    >
      {categories.map((c) => (
        <option key={c} value={c}>
          {c === "all" ? "All categories" : c}
        </option>
      ))}
    </select>
  );
}

export default CategoryFilter;
