import { getDictionary } from "@/lib/i18n";
import en from "@/i18n/dictionaries/en.json";

function keys(o: object, prefix = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    typeof v === "object" && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}
test.each(["es", "fr", "de", "pt"])("%s has identical keys to en", (lang) => {
  const d = getDictionary(lang) as unknown as object;
  expect(keys(d).sort()).toEqual(keys(en).sort());
});
test("es translates nav", () => {
  expect(getDictionary("es").nav.home).toBe("Inicio");
});
