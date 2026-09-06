import { SUPPORTED_LOCALES, DEFAULT_LOCALE, isValidLocale, getDictionary } from "@/lib/i18n";

test("supports top-5, defaults to en", () => {
  expect([...SUPPORTED_LOCALES]).toEqual(["en", "es", "fr", "de", "pt"]);
  expect(DEFAULT_LOCALE).toBe("en");
  expect(isValidLocale("es")).toBe(true);
  expect(isValidLocale("xx")).toBe(false);
});

test("getDictionary falls back to en on unknown", () => {
  const d = getDictionary("xx");
  expect(d.nav.home).toBe("Home");
  expect(d.common.skipToContent).toBe("Skip to content");
});
