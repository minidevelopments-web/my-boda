# Multilingual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add EN/ES/FR/DE/PT guest + admin UI translation with `/[lang]` prefix and auto-detect, no new dependencies.

**Architecture:** Custom JSON dictionaries + `src/lib/i18n.ts` `getDictionary()` + `app/[lang]/` routing + extended `middleware.ts` (locale first, admin-auth second).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Jest + ts-jest (jsdom), date-fns (existing), Intl.DateTimeFormat/NumberFormat.

## Global Constraints

- SUPPORTED_LOCALES = ['en','es','fr','de','pt'], DEFAULT_LOCALE = 'en'.
- No new npm dependencies (custom dictionaries only).
- URL prefix required: `/en/...`, `/es/...`; invalid prefix → 307 `/en/...`.
- Locale pick order: cookie `locale` > Accept-Language (supported match) > en; root `/` → 307.
- Cookie name = `locale`, max-age 1 year.
- User-entered content (schedule titles/descriptions, accommodation names, registry notes from env) stays as-entered in v1 — only UI chrome + validation + metadata translated.
- Missing key falls back to English + console.warn in dev.
- Every task ends with working tests + commit.

---

### Task 1: i18n foundation (locales + loader + English dictionary)

**Files:**
- Create: `src/i18n/locales.ts`
- Create: `src/lib/i18n.ts`
- Create: `src/i18n/dictionaries/en.json`
- Test: `__tests__/i18n-foundation.test.ts`

**Interfaces:**
- Consumes: nothing (greenfield).
- Produces: `SUPPORTED_LOCALES: readonly ['en','es','fr','de','pt']`, `DEFAULT_LOCALE = 'en'`, `type Locale`, `isValidLocale(x: string): x is Locale`, `getDictionary(lang: string): Dictionary` (fallback en), `type Dictionary` (nested keys: nav, footer, home, rsvp, info, registry, admin, common). Later tasks rely on exact names.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/i18n-foundation.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/i18n-foundation.test.ts 2>&1 | head -30`
Expected: FAIL with "Cannot find module '@/lib/i18n'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/i18n/locales.ts
export const SUPPORTED_LOCALES = ["en", "es", "fr", "de", "pt"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export function isValidLocale(x: string): x is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(x);
}
```

```json
// src/i18n/dictionaries/en.json
{
  "nav": { "home": "Home", "rsvp": "RSVP", "info": "Info", "registry": "Registry" },
  "footer": { "tagline": "Your wedding is private. Your data should be too.", "credit": "Created with My Boda — Open Source Wedding Platform" },
  "home": { "title": "My Boda — Wedding Platform", "description": "Your wedding is private. Your data should be too." },
  "rsvp": { "title": "RSVP", "subtitle": "Let us know if you can make it. We can't wait to see you!", "backHome": "Back to home", "send": "Send RSVP", "name": "Name", "email": "Email", "successTitle": "Thank you! Your RSVP has been received.", "errors": { "nameRequired": "Name is required", "invalidEmail": "Invalid email" } },
  "info": { "title": "Wedding Info", "schedule": "Schedule", "venue": "Venue", "accommodations": "Accommodations", "emptySchedule": "Schedule to be announced." },
  "registry": { "title": "Gift Registry" },
  "admin": { "title": "Admin", "login": "Login", "guests": "Guests" },
  "common": { "skipToContent": "Skip to content", "backHome": "Back to home" }
}
```

```ts
// src/lib/i18n.ts
import { DEFAULT_LOCALE, isValidLocale, type Locale } from "@/i18n/locales";
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
export { DEFAULT_LOCALE, isValidLocale };
export type { Locale };
```

Note: `tsconfig.json` already maps `@/*` to `src/*`; JSON import needs `resolveJsonModule` — if tsc complains, add `"resolveJsonModule": true` to tsconfig (allowed).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/i18n-foundation.test.ts 2>&1 | tail -10`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add src/i18n/locales.ts src/lib/i18n.ts src/i18n/dictionaries/en.json __tests__/i18n-foundation.test.ts
git commit -m "feat(i18n): foundation with locales, loader, English dictionary"
```

### Task 2: Remaining 4 dictionaries + parity test

**Files:**
- Create: `src/i18n/dictionaries/es.json`, `fr.json`, `de.json`, `pt.json`
- Modify: `src/lib/i18n.ts:7-12` (register es/fr/de/pt imports)
- Test: `__tests__/i18n-parity.test.ts`

**Interfaces:**
- Consumes: `Dictionary` type from Task 1.
- Produces: same `getDictionary('es'|'fr'|'de'|'pt')` returning translated `Dictionary` with identical key sets.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/i18n-parity.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/i18n-parity.test.ts 2>&1 | head -20`
Expected: FAIL (Cannot find module es.json / keys mismatch)

- [ ] **Step 3: Write minimal implementation**

Create 4 JSONs mirroring en keys (translate values):
- es: Home→Inicio, RSVP→RSVP, Info→Información, Registry→Regalos, Skip→Saltar al contenido, Thank you→¡Gracias! Hemos recibido tu RSVP., etc.
- fr: Home→Accueil, Info→Informations, Registry→Liste de cadeaux, Skip→Aller au contenu.
- de: Home→Start, Info→Infos, Registry→Geschenkliste, Skip→Zum Inhalt springen.
- pt: Home→Início, Info→Informações, Registry→Lista de presentes, Skip→Pular para o conteúdo.

Update loader:

```ts
import es from "@/i18n/dictionaries/es.json";
import fr from "@/i18n/dictionaries/fr.json";
import de from "@/i18n/dictionaries/de.json";
import pt from "@/i18n/dictionaries/pt.json";
const dicts: Record<string, Dictionary> = { en, es: es as Dictionary, fr: fr as Dictionary, de: de as Dictionary, pt: pt as Dictionary };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/i18n-parity.test.ts __tests__/i18n-foundation.test.ts 2>&1 | tail -8`
Expected: PASS (7 passed)

- [ ] **Step 5: Commit**

```bash
git add src/i18n/dictionaries/ src/lib/i18n.ts __tests__/i18n-parity.test.ts
git commit -m "feat(i18n): add ES/FR/DE/PT dictionaries with parity test"
```

### Task 3: Middleware locale detection + root redirect

**Files:**
- Modify: `middleware.ts:83-128`
- Test: `__tests__/i18n-middleware.test.ts` (pure helper, no Next server needed)

**Interfaces:**
- Consumes: `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `isValidLocale` from Task 1.
- Produces: `pickLocale(acceptLanguage: string | null, cookie: string | null): Locale` exported from `src/lib/i18n.ts`; middleware behavior: `/` → 307 `/[picked]` + set `locale` cookie; `/xx/...` invalid prefix → 307 `/en/...`; valid prefix → strip and run existing admin-auth.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/i18n-middleware.test.ts
import { pickLocale } from "@/lib/i18n";
test("cookie wins", () => expect(pickLocale("fr-FR,fr;q=0.9", "de")).toBe("de"));
test("accept-language match", () => expect(pickLocale("es-ES,es;q=0.9,en;q=0.8", null)).toBe("es"));
test("fallback en", () => expect(pickLocale(null, null)).toBe("en"));
test("ignores invalid cookie", () => expect(pickLocale("pt-BR,pt;q=0.9", "xx")).toBe("pt"));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/i18n-middleware.test.ts 2>&1 | head -15`
Expected: FAIL "pickLocale is not a function"

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/i18n.ts`:

```ts
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
```

Middleware edit (top of `middleware()` in `middleware.ts`, before admin checks):

```ts
import { isValidLocale, pickLocale } from "@/lib/i18n";
// inside middleware(req):
const segs = pathname.split("/").filter(Boolean);
const maybeLang = segs[0];
if (pathname === "/") {
  const cookie = req.cookies.get("locale")?.value ?? null;
  const lang = pickLocale(req.headers.get("accept-language"), cookie);
  const res = NextResponse.redirect(new URL(`/${lang}`, req.url));
  res.cookies.set("locale", lang, { path: "/", maxAge: 31536000 });
  return res;
}
if (maybeLang && !isValidLocale(maybeLang) && ["admin","api","rsvp","info","registry","_next"].includes(maybeLang)) {
  // legacy unprefixed public path → prefix with detected locale
  const cookie = req.cookies.get("locale")?.value ?? null;
  const lang = pickLocale(req.headers.get("accept-language"), cookie);
  return NextResponse.redirect(new URL(`/${lang}${pathname}`, req.url));
}
if (maybeLang && !isValidLocale(maybeLang)) {
  return NextResponse.redirect(new URL(`/en${pathname}`, req.url));
}
// strip prefix for existing auth checks:
const stripped = "/" + segs.slice(1).join("/");
```

Then run existing admin-auth logic against `stripped` instead of `pathname`. Update `matcher` to `["/((?!_next|.*\\..*).*)"]` so locale paths hit middleware.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/i18n-middleware.test.ts 2>&1 | tail -6`
Expected: PASS. Then `npx tsc --noEmit 2>&1 | head -20` must show no new type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.ts middleware.ts __tests__/i18n-middleware.test.ts
git commit -m "feat(i18n): locale detection, root redirect, prefix guard in middleware"
```

### Task 4: Routing migration to `app/[lang]`

**Files:**
- Create: `app/[lang]/layout.tsx` (from current `app/layout.tsx`, adds lang param + dict + hreflang)
- Create: `app/page.tsx` (root redirector, replaces `src/app/page.tsx` home — home moves)
- Move: `src/app/page.tsx` → `src/app/[lang]/page.tsx`; `src/app/rsvp/page.tsx` → `src/app/[lang]/rsvp/page.tsx`; `src/app/info/page.tsx` → `src/app/[lang]/info/page.tsx`; `src/app/registry/page.tsx` → `src/app/[lang]/registry/page.tsx`; `src/app/admin/` → `src/app/[lang]/admin/`
- Test: manual + `npx tsc --noEmit`

**Interfaces:**
- Consumes: `getDictionary`, `Locale` from Tasks 1-2.
- Produces: every page signature `({ params: { lang: Locale } })`; `[lang]/layout.tsx` exports `generateStaticParams()` returning 5 locales.

- [ ] **Step 1: Write the failing test (static params contract)**

```ts
// __tests__/i18n-routing.test.ts
test("generateStaticParams covers 5 locales", async () => {
  const { generateStaticParams } = await import("@/app/[lang]/layout");
  expect(await generateStaticParams()).toEqual([{ lang: "en" }, { lang: "es" }, { lang: "fr" }, { lang: "de" }, { lang: "pt" }]);
});
```

(Jest moduleNameMapper `@/` already covers `src/`; for `app/` add mapper `"^@/app/(.*)$": "<rootDir>/src/app/$1"` to `jest.config.js` in this step if needed.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/i18n-routing.test.ts 2>&1 | head -15`
Expected: FAIL "Cannot find module '@/app/[lang]/layout'"

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/app/[lang]/layout.tsx
import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getSiteConfig } from "@/lib/config";
import { getDictionary, type Locale } from "@/lib/i18n";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
import "../globals.css";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
export function generateStaticParams() { return SUPPORTED_LOCALES.map((lang) => ({ lang })); }
export async function generateMetadata({ params }: { params: { lang: Locale } }): Promise<Metadata> {
  const dict = getDictionary(params.lang);
  return { title: dict.home.title, description: dict.home.description, alternates: { languages: { en: "/en", es: "/es", fr: "/fr", de: "/de", pt: "/pt" } } };
}
export default function LangLayout({ children, params }: { children: React.ReactNode; params: { lang: Locale } }) {
  const config = getSiteConfig();
  const dict = getDictionary(params.lang);
  return (
    <html lang={params.lang} className={`${inter.variable} ${playfair.variable}`}>
      <body className={`${inter.className} min-h-screen bg-white antialiased`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:bg-white focus:px-4 focus:py-2">{dict.common.skipToContent}</a>
        <Header config={config} lang={params.lang} dict={dict} />
        <main id="main" className="min-h-[calc(100vh-8rem)]">{children}</main>
        <Footer dict={dict} />
      </body>
    </html>
  );
}
```

```tsx
// src/app/page.tsx (root, keep old app/layout minimal elsewhere or delete src/app/layout.tsx)
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { pickLocale } from "@/lib/i18n";
export default function RootPage() {
  const cookie = cookies().get("locale")?.value ?? null;
  const al = headers().get("accept-language");
  redirect(`/${pickLocale(al, cookie)}`);
}
```

Move pages with `git mv`, update each page to accept `{ params: { lang } }`, call `getDictionary(params.lang)`, and prefix internal `Link href="/..."` → `href={`/${params.lang}/...`}`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/i18n-routing.test.ts 2>&1 | tail -6` then `npx tsc --noEmit 2>&1 | head -20`
Expected: PASS + no type errors (fix import paths until clean)

- [ ] **Step 5: Commit**

```bash
git add src/app/ jest.config.js __tests__/i18n-routing.test.ts
git commit -m "feat(i18n): migrate routes under app/[lang] with localized layout"
```

### Task 5: Header + Footer + LanguageSwitcher

**Files:**
- Modify: `src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx`
- Create: `src/components/layout/LanguageSwitcher.tsx`
- Test: `__tests__/language-switcher.test.tsx`

**Interfaces:**
- Consumes: `Dictionary`, `Locale` (Tasks 1-2), `dict` prop from Task 4 layout.
- Produces: `Header({ config, lang, dict })`, `Footer({ dict })`, `LanguageSwitcher({ lang })`.

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/language-switcher.test.tsx
import { render, screen } from "@testing-library/react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
test("renders 5 locales and marks current", () => {
  render(<LanguageSwitcher lang="es" />);
  expect(screen.getByLabelText(/idioma|language|langue/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /english/i })).toHaveAttribute("href", expect.stringContaining("/en"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/language-switcher.test.tsx 2>&1 | head -15`
Expected: FAIL "Cannot find module"

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/layout/LanguageSwitcher.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
const NAMES: Record<string, string> = { en: "English", es: "Español", fr: "Français", de: "Deutsch", pt: "Português" };
export function LanguageSwitcher({ lang }: { lang: string }) {
  const pathname = usePathname();
  const rest = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
  return (
    <nav aria-label="Language">
      {SUPPORTED_LOCALES.map((l) => (
        <Link key={l} href={`/${l}${rest}`} hrefLang={l} aria-current={l === lang ? "true" : undefined} onClick={() => { document.cookie = `locale=${l}; path=/; max-age=31536000`; }}>
          {NAMES[l]}
        </Link>
      ))}
    </nav>
  );
}
```

Header: change signature to `Header({ config, lang, dict }: { config?; lang: string; dict: Dictionary })`, replace hardcoded labels with `dict.nav.*`, keep `aria-current={pathname === ...}` logic but compare against stripped pathname, render `<LanguageSwitcher lang={lang} />`. Footer: `Footer({ dict }: { dict: Dictionary })` rendering `dict.footer.*`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/language-switcher.test.tsx 2>&1 | tail -6`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/ __tests__/language-switcher.test.tsx
git commit -m "feat(i18n): translate header/footer, add language switcher"
```

### Task 6: Guest pages + RSVP validation messages

**Files:**
- Modify: `src/app/[lang]/rsvp/page.tsx`, `src/app/[lang]/info/page.tsx`, `src/app/[lang]/registry/page.tsx`, `src/app/[lang]/page.tsx`, `src/components/rsvp/RsvpForm.tsx`, `src/components/info/Schedule.tsx`, `src/components/info/AccommodationList.tsx`, `src/components/info/MapEmbed.tsx`, `src/components/registry/GiftCard.tsx`, `src/lib/validators.ts`
- Test: `__tests__/rsvp-i18n.test.tsx`

**Interfaces:**
- Consumes: `dict` prop pattern from Task 4.
- Produces: `RsvpForm({ messages }: { messages: Dictionary["rsvp"] })`; `makeRsvpSchema(messages)` factory in validators.

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/rsvp-i18n.test.tsx
import { render, screen } from "@testing-library/react";
import RsvpForm from "@/components/rsvp/RsvpForm";
import { getDictionary } from "@/lib/i18n";
test("spanish form shows translated send button", () => {
  render(<RsvpForm messages={getDictionary("es").rsvp} />);
  expect(screen.getByRole("button", { name: /enviar/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/rsvp-i18n.test.tsx 2>&1 | head -20`
Expected: FAIL (RsvpForm takes no props / button still "Send RSVP")

- [ ] **Step 3: Write minimal implementation**

Validators — add factory (keep old `rsvpSchema` export as en-default for API compat):

```ts
import type { Dictionary } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";
export function makeRsvpSchema(m: Dictionary["rsvp"]) {
  return z.object({
    name: z.string().min(1, m.errors.nameRequired).max(100),
    email: z.string().email(m.errors.invalidEmail).optional().or(z.literal("")),
    attending: z.boolean(),
    headcount: z.number().int().min(1).max(10).default(1),
    mealChoice: z.enum(["vegetarian", "vegan", "meat", "fish"]).optional().nullable(),
    dietaryNotes: z.string().max(500).optional().nullable(),
    message: z.string().max(1000).optional().nullable(),
    guestId: z.string().optional(),
    category: z.enum(["family", "friends", "colleagues", "other"]).optional(),
    plusOne: z.boolean().optional(),
    plusOneName: z.string().max(100).optional().nullable(),
  });
}
export const rsvpSchema = makeRsvpSchema(getDictionary("en").rsvp);
```

RsvpForm: `export default function RsvpForm({ messages }: { messages: Dictionary["rsvp"] })`, replace all hardcoded labels/placeholders/buttons/success/error-fallback strings with `messages.*`, validate with `makeRsvpSchema(messages)`. Pages: replace `Wedding Info/Schedule/Venue/Accommodations` headings with `dict.info.*`, `Schedule to be announced` with `dict.info.emptySchedule`, format `{config.weddingDate}` via `new Intl.DateTimeFormat(lang, { dateStyle: "long" }).format(new Date(config.weddingDate))`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/rsvp-i18n.test.tsx __tests__/rsvp-form.test.tsx __tests__/validators.test.ts 2>&1 | tail -8`
Expected: PASS (update old rsvp-form tests to pass `messages={getDictionary("en").rsvp}`)

- [ ] **Step 5: Commit**

```bash
git add src/app/ src/components/ src/lib/validators.ts __tests__/rsvp-i18n.test.tsx
git commit -m "feat(i18n): translate guest pages and RSVP validation"
```

### Task 7: Admin UI + dates + final verification

**Files:**
- Modify: `src/app/[lang]/admin/page.tsx`, `src/app/[lang]/admin/login/page.tsx`, `src/components/admin/StatsCards.tsx`, `src/components/admin/GuestTable.tsx`, `src/components/admin/CategoryFilter.tsx`
- Test: `__tests__/admin-i18n.test.tsx`

**Interfaces:**
- Consumes: `dict.admin` from Task 2, `Intl` formatting from Task 6.
- Produces: admin pages fully translated; `npm run build` passes for all 5 locales.

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/admin-i18n.test.tsx
import { getDictionary } from "@/lib/i18n";
test("admin dicts differ per locale", () => {
  expect(getDictionary("de").admin.guests).not.toBe(getDictionary("en").admin.guests);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/admin-i18n.test.tsx 2>&1 | head -15`
Expected: FAIL (admin.guests identical / missing)

- [ ] **Step 3: Write minimal implementation**

Fill `admin.*` keys per locale (Login→Iniciar sesión/Connexion/Anmelden/Entrar, Guests→Invitados/Invités/Gäste/Convidados, etc.), thread `dict.admin` through StatsCards/GuestTable/CategoryFilter/login form, format admin dates with `Intl.DateTimeFormat(lang)`. API `/api/v1/rsvp` error messages: read `Accept-Language` header, `getDictionary(pickLocale(header,null)).rsvp` for server messages.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest 2>&1 | tail -8` then `npm run build 2>&1 | tail -15`
Expected: all Jest suites PASS; build succeeds with 5 `[lang]` static params

- [ ] **Step 5: Commit**

```bash
git add src/app/ src/components/admin/ __tests__/admin-i18n.test.tsx
git commit -m "feat(i18n): translate admin UI, localize dates and API messages"
```

## Self-Review

- Spec coverage: §1 routing+middleware → Tasks 3-4; §2 components+switcher+dates → Tasks 5-7; §3 flow/fallback/tests → Tasks 1-3 + parity/middleware tests. hreflang in Task 4 metadata. No DB change respected.
- Placeholder scan: no TBD/TODO; every step has exact paths, code, commands, expected output.
- Type consistency: `Locale`, `Dictionary`, `getDictionary(lang: string)`, `pickLocale(al, cookie)`, `Header({config,lang,dict})`, `Footer({dict})`, `RsvpForm({messages})`, `makeRsvpSchema(m)` used identically across tasks.
