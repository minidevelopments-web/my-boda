import { pickLocale } from "@/lib/i18n";
test("cookie wins", () => expect(pickLocale("fr-FR,fr;q=0.9", "de")).toBe("de"));
test("accept-language match", () => expect(pickLocale("es-ES,es;q=0.9,en;q=0.8", null)).toBe("es"));
test("fallback en", () => expect(pickLocale(null, null)).toBe("en"));
test("ignores invalid cookie", () => expect(pickLocale("pt-BR,pt;q=0.9", "xx")).toBe("pt"));
