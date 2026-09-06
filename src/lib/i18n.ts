import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isValidLocale, type Locale } from "@/i18n/locales";
import en from "@/i18n/dictionaries/en.json";
export type Dictionary = typeof en;
const dicts: Record<string, Dictionary> = { en };
export function getDictionary(lang: string): Dictionary {
  if (!isValidLocale(lang)) {
    if (process.env.NODE_ENV !== "production") console.warn(`[i18n] unknown locale '${lang}', falling back to en`);
    return en;
  }
  return dicts[lang] ?? en;
}
export { DEFAULT_LOCALE, SUPPORTED_LOCALES, isValidLocale };
export type { Locale };
