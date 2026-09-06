import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isValidLocale, type Locale } from "@/i18n/locales";
import en from "@/i18n/dictionaries/en.json";
import es from "@/i18n/dictionaries/es.json";
import fr from "@/i18n/dictionaries/fr.json";
import de from "@/i18n/dictionaries/de.json";
import pt from "@/i18n/dictionaries/pt.json";
export type Dictionary = typeof en;
const dicts: Record<string, Dictionary> = { en, es: es as Dictionary, fr: fr as Dictionary, de: de as Dictionary, pt: pt as Dictionary };
export function getDictionary(lang: string): Dictionary {
  if (!isValidLocale(lang)) {
    if (process.env.NODE_ENV !== "production") console.warn(`[i18n] unknown locale '${lang}', falling back to en`);
    return en;
  }
  return dicts[lang] ?? en;
}
export { DEFAULT_LOCALE, SUPPORTED_LOCALES, isValidLocale };
export type { Locale };
export function pickLocale(acceptLanguage: string | null, cookie: string | null): Locale {
  if (cookie && isValidLocale(cookie)) return cookie;
  if (acceptLanguage) {
    const tags = acceptLanguage.split(",").map((p) => p.split(";")[0].trim().toLowerCase());
    for (const t of tags) {
      const base = t.split("-")[0];
      if (isValidLocale(base)) return base;
    }
  }
  return DEFAULT_LOCALE;
}
