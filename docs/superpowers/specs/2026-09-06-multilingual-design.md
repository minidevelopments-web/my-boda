# Multilingual (EN/ES/FR/DE/PT) — Design

Date: 2026-09-06
Status: approved sections §1-§3, pending spec review
Scope: Guest UI + Admin UI, custom dictionaries, prefix + auto-detect

## Context

`my-boda` is a Next.js 16 App Router wedding platform (React 19). UI is English-only, no i18n library. Strings are hardcoded in ~20 tsx files (Header/Footer/Home/RSVP/Info/Registry + admin StatsCards/GuestTable/CategoryFilter/login). Config-driven content via `NEXT_PUBLIC_*` env stays as-entered.

Decisions: locales EN, ES, FR, DE, PT (default EN) · scope everything incl. admin UI · URL prefix + auto-detect · approach A custom dictionaries (no new dep).

## §1 Architecture (approved)

- Routing: move guest + admin pages under `app/[lang]/...`. `app/page.tsx` becomes root redirector (`/` → `/[best]` 307).
- `src/i18n/`: `locales.ts` (`SUPPORTED_LOCALES = ['en','es','fr','de','pt']`, `DEFAULT_LOCALE='en'`), `dictionaries/{en,es,fr,de,pt}.json`, `lib/i18n.ts` (`getDictionary(lang)`, typed `Dictionary`, `isValidLocale()`).
- Middleware (`middleware.ts` extended): 1) parse locale prefix, invalid → redirect `/en/...`; 2) bare `/` → pick `cookie(locale) > Accept-Language (match supported) > en`, set cookie, 307; 3) existing admin-auth checks run on stripped pathname (`/[lang]/admin*`, `/api/v1/guests*` unchanged, API locale via `Accept-Language` header, not URL).
- `RootLayout` takes `params.lang`, sets `<html lang={lang}>`, loads dict server-side, passes to Header/Footer. Metadata localized per lang.
- No DB migration.

## §2 Components & scope (approved)

- Server components take `dict` prop: Header (nav + brand aria), Footer, Home/Info/Registry pages, Schedule (`ul/li` strings + empty state), AccommodationList, MapEmbed fallback text, GiftCard, admin pages.
- Client islands (`RsvpForm`, `LanguageSwitcher`, `ThemeContext` strings if any) receive dict slice via props, not `useDictionary` global — keeps server/client boundary explicit and matches current `config` prop pattern.
- New `LanguageSwitcher` (client) in Header: `<select>` or links, on change sets `locale` cookie (`max-age 1y`) + `router.push(/newLang + restPathname)`, `aria-label` localized.
- v1 explicitly out of scope: translating user-entered content (schedule titles/descriptions, accommodation names, registry notes entered via env/seed). Those render as-entered. Per-locale content fields deferred.
- Dates: `Intl.DateTimeFormat(lang)` for display + `date-fns/locale` (`es,fr,de,pt`) where `date-fns` already used. Numbers/currency via `Intl.NumberFormat(lang)`.
- Validation (Zod in RsvpForm + API errors): messages from dict, keyed by error code, not raw English strings.

## §3 Data flow / errors / testing (approved)

- Flow: `app/[lang]/page → getDictionary(lang) → <Page dict> → children`. Client: `<RsvpForm messages={dict.rsvp}>`.
- Missing key: `t()` helper falls back to `en` value + `console.warn` in dev; CI parity test fails on missing keys so fallback is safety net only.
- Errors: unknown locale prefix → 307 `/en/...`; missing `Accept-Language` → `en`; corrupt cookie → ignore, re-detect.
- Tests: (1) jest `i18n.parity.test.ts` — all 5 JSONs have identical key sets; (2) middleware locale tests (redirect, cookie, invalid); (3) RSVP validation message snapshot per locale; (4) smoke: build + visit `/es/rsvp` asserts `<html lang=es>`.
- SEO: `hreflang` alternates in metadata + `Content-Language` not needed with prefix.

## Files to touch (for plan phase)

- New: `src/i18n/locales.ts`, `src/i18n/dictionaries/*.json` (5), `src/lib/i18n.ts`, `src/components/layout/LanguageSwitcher.tsx`, `__tests__/i18n.parity.test.ts`.
- Move: `app/*/page.tsx` → `app/[lang]/*/page.tsx`, `app/layout.tsx` → `app/[lang]/layout.tsx` (+ root redirect `app/page.tsx`).
- Edit: `middleware.ts`, `Header.tsx`, `Footer.tsx`, all guest + admin components for `dict` props, `RsvpForm` validation messages.

## Self-review

- No TBDs; keys enumerated by component.
- Consistent: prefix everywhere, API excluded from prefix (header-based) — no contradiction.
- Scope fits single plan: ~150 strings, no DB change, admin included but same mechanism.
- Unambiguous: fallback=en, invalid→/en, cookie name=`locale`, v1 user-content untranslated.
