"use client";

import { useState, useMemo, useEffect } from "react";
import { CategoryFilter } from "./CategoryFilter";

type Rsvp = {
  attending: boolean | null;
  mealChoice?: string | null;
  respondedAt?: string | Date | null;
  headcount?: number | null;
} | null | undefined;

type Guest = {
  id: string;
  name: string;
  email?: string | null;
  category: string;
  plusOne: boolean;
  plusOneName?: string | null;
  createdAt?: string | Date;
  rsvp?: Rsvp;
};

type AdminDict = {
  searchPlaceholder?: string;
  searchLabel?: string;
  filterLabel?: string;
  allCategories?: string;
  exportCsv?: string;
  name?: string;
  category?: string;
  plusOne?: string;
  attending?: string;
  mealChoice?: string;
  respondedAt?: string;
  noGuests?: string;
  editCategory?: string;
  editCategoryFor?: string;
  yes?: string;
  no?: string;
};

type Props = {
  guests: Guest[];
  lang?: string;
  dict?: AdminDict;
};

const DEFAULT_DICT: Required<AdminDict> = {
  searchPlaceholder: "Search guests...",
  searchLabel: "Search guests",
  filterLabel: "Filter by category",
  allCategories: "All categories",
  exportCsv: "Export CSV",
  name: "Name",
  category: "Category",
  plusOne: "Plus One",
  attending: "Attending",
  mealChoice: "Meal Choice",
  respondedAt: "Responded At",
  noGuests: "No guests found",
  editCategory: "Edit category",
  editCategoryFor: "Edit category for {name}",
  yes: "yes",
  no: "no",
};

type SortKey = "name" | "category" | "plusOne" | "attending" | "mealChoice" | "respondedAt";
type SortDir = "asc" | "desc";

export function GuestTable({ guests: initialGuests, lang = "en", dict }: Props) {
  const t = { ...DEFAULT_DICT, ...dict };
  const formatDate = (d: string | Date) => {
    try {
      return new Intl.DateTimeFormat(lang).format(new Date(d as string));
    } catch {
      return new Date(d as string).toLocaleDateString();
    }
  };
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const r = await fetch("/api/v1/guests");
        if (r.ok) {
          const d = await r.json();
          if (Array.isArray(d.data)) setGuests(d.data);
        }
      } catch {}
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    let list = [...guests];
    if (category !== "all") {
      list = list.filter((g) => g.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.email && g.email.toLowerCase().includes(q)) ||
          g.category.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "name":
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
          break;
        case "category":
          av = a.category;
          bv = b.category;
          break;
        case "plusOne":
          av = a.plusOne ? 1 : 0;
          bv = b.plusOne ? 1 : 0;
          break;
        case "attending":
          av = a.rsvp?.attending === true ? 1 : a.rsvp?.attending === false ? 0 : -1;
          bv = b.rsvp?.attending === true ? 1 : b.rsvp?.attending === false ? 0 : -1;
          break;
        case "mealChoice":
          av = (a.rsvp?.mealChoice as string) || "";
          bv = (b.rsvp?.mealChoice as string) || "";
          break;
        case "respondedAt":
          av = a.rsvp?.respondedAt ? new Date(a.rsvp.respondedAt as string).getTime() : 0;
          bv = b.rsvp?.respondedAt ? new Date(b.rsvp.respondedAt as string).getTime() : 0;
          break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [guests, search, category, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleCategoryChange(id: string, newCategory: string) {
    try {
      const res = await fetch(`/api/v1/guests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory }),
      });
      if (res.ok) {
        const json = await res.json();
        const updated = json.data as Guest;
        setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, category: updated.category } : g)));
        setEditingId(null);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDownloadCSV() {
    try {
      const res = await fetch("/api/v1/guests/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "guests.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t.searchLabel}
          className="min-w-[200px] flex-1 rounded border px-3 py-2 text-sm md:flex-none"
        />
        <CategoryFilter value={category} onChange={setCategory} label={t.filterLabel} allLabel={t.allCategories} />
        <button
          onClick={handleDownloadCSV}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          {t.exportCsv}
        </button>
      </div>

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="cursor-pointer px-3 py-2 font-medium" onClick={() => handleSort("name")}>{t.name} {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
              <th className="cursor-pointer px-3 py-2 font-medium" onClick={() => handleSort("category")}>{t.category} {sortKey === "category" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
              <th className="cursor-pointer px-3 py-2 font-medium" onClick={() => handleSort("plusOne")}>{t.plusOne} {sortKey === "plusOne" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
              <th className="cursor-pointer px-3 py-2 font-medium" onClick={() => handleSort("attending")}>{t.attending} {sortKey === "attending" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
              <th className="cursor-pointer px-3 py-2 font-medium" onClick={() => handleSort("mealChoice")}>{t.mealChoice} {sortKey === "mealChoice" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
              <th className="cursor-pointer px-3 py-2 font-medium" onClick={() => handleSort("respondedAt")}>{t.respondedAt} {sortKey === "respondedAt" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">{t.noGuests}</td>
              </tr>
            ) : (
              filtered.map((g) => (
                <tr key={g.id} className="border-t">
                  <td className="px-3 py-2">{g.name}</td>
                  <td className="px-3 py-2">
                    {editingId === g.id ? (
                      <select
                        value={g.category}
                        onChange={(e) => handleCategoryChange(g.id, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        autoFocus
                        aria-label={t.editCategory}
                        className="rounded border px-2 py-1 text-sm"
                      >
                        <option value="family">family</option>
                        <option value="friends">friends</option>
                        <option value="colleagues">colleagues</option>
                        <option value="other">other</option>
                      </select>
                    ) : (
                      <button onClick={() => setEditingId(g.id)} className="rounded px-2 py-1 hover:bg-gray-100" aria-label={t.editCategoryFor.replace("{name}", g.name)}>
                        {g.category}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2">{g.plusOne ? t.yes : t.no}</td>
                  <td className="px-3 py-2">{g.rsvp?.attending === true ? t.yes : g.rsvp?.attending === false ? t.no : ""}</td>
                  <td className="px-3 py-2">{(g.rsvp?.mealChoice as string) || ""}</td>
                  <td className="px-3 py-2">{g.rsvp?.respondedAt ? formatDate(g.rsvp.respondedAt as string) : ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default GuestTable;
