# Guest-Facing Fundamentals Design (typeui-fundamentals)

## Context
`my-boda` wedding platform (Next.js 16, Tailwind, Inter + Playfair_Display).
Guest-facing surfaces: Home (theme-driven: `ClassicElegance`, `GardenRomance`,
`ModernMinimal`), RSVP (`rsvp/page.tsx` + `RsvpForm.tsx`), Info, Registry,
plus shared `Header`/`Footer` and single `ui/Button.tsx` (anchor-only).

Theme tokens exist per-theme in `src/lib/theme/tokens.ts` (colors, typography,
radius) consumed via `ThemeContext` — no prop drilling. Missing: shared
spacing/type scale, unified control states, form UX contracts, WCAG pass.
`src/app/globals.css` is 17 lines (3 vars); `tailwind.config.ts` only adds
`accent` + fonts. `next/font` is loaded twice (`layout.tsx` + each theme file).

All 31 GitHub issues are CLOSED — this is greenfield design debt.
Scope (user, 2026-09-04): **guest-facing first, Admin deferred** to follow-up.

Fundamentals load order (mandatory): design-system tokens first, then
`spacing-principles` → `ui-principles` → `typography-principles`,
`accessibility` non-negotiable throughout. System wins on conflicts.

## Architecture
Token-first foundation, then module audits. One shared token layer in
`globals.css` + `tailwind.config.ts` + `src/lib/theme/{tokens,types}.ts`
extends (colors, spacing tiers, type scale, radius, shadows). All four
guest surfaces consume tokens via `ThemeContext`; no page-local hex/spacing.

- `globals.css`: CSS vars for spacing tiers, type scale, radius, shadows.
- `tailwind.config.ts`: map vars to theme extension (no hardcoded values in pages).
- `src/lib/theme/*`: extend `ThemeTokens` with spacing/typography scales;
  per-theme overrides only (classic sharp `0px`, garden pill/card `24px`).
- Components read tokens via `useTheme()`; `Button` gains `<button>` support.

## Components
1. **Token foundation** — vars + config + `ThemeTokens` extension. Unblocks all below.
2. **Spacing** — section tiers (hero/content/form), inner-vs-outer gaps,
   heading→paragraph rhythm. Fixes `py-24/32` vs `py-12` vs `py-8` drift and
   `max-w-2xl/3xl/5xl/6xl` inconsistency.
3. **Typography** — single `next/font` load in `layout.tsx`, modular H1/H2/body/
   caption scale, leading, `max-w-prose` measure. Removes per-theme font init.
4. **Controls (`ui/Button` + form fields)** — 9-state contract
   (default/hover/active/focus/disabled/loading/error + visited for links),
   nested-radius formula (`inner = outer − padding`), input-contrast on tinted
   surfaces. Replaces raw `bg-black` submit and `border` admin-style buttons.
5. **RSVP UX** — human `submitError` (no raw `JSON.stringify`), focus to error
   summary/success region, 44px radio/checkbox targets, conditional
   `headcount/meal/plusOne` transitions without layout jump.
6. **Accessibility** — skip link, `aria-current` nav, list semantics for
   Schedule/timeline, `aria-hidden` decoratives (diamond, ✿, dividers),
   contrast + `focus-visible` + `prefers-reduced-motion` audit.
7. **Responsive** — unified containers, hero stack (`flex-col`→`sm:flex-row`
   already ok, standardize), `h-64` map placeholder, form rhythm.

Out of scope: Admin (`admin/*`, `GuestTable`, `StatsCards`, login), API, DB,
auth, i18n, visual-regression infra.

## Data flow
No runtime data changes. Tokens flow: `SiteConfig` → `getThemeForConfig` →
`ThemeProvider` → `useTheme()` → components. Forms keep existing
`rsvpSchema.safeParse` + `POST /api/v1/rsvp` flow; only error rendering,
focus management, and control styling change.

## Error handling
- RSVP validation: keep first-error-per-field; add error-summary region with
  focus + human server-error copy (map `json.error` to sentence, never raw JSON).
- Token conflicts: design-system value wins; flag principle conflicts for review.
- Accessibility violations block merge (contrast, focus, names, targets).

## Testing
- `npx tsc --noEmit` passes; `npm test` passes; `npm run build` passes.
- Manual per-surface checklist: keyboard-only RSVP submit, screen-reader names
  for controls, 44px target spot-check, `prefers-reduced-motion` on,
  360px/768px/1280px viewports, all three themes (`classic`/`modern`/`garden`).
- Contrast spot-check on accent `#b48a78` over backgrounds + green/red states.

## Alternatives considered
- **Surface slices (Home→RSVP→Info→Registry).** Faster visible wins but mints
  tokens per-page, risks divergence. Rejected: violates fundamentals order.
- **A11y quick-wins first.** Lower risk but leaves spacing/type drift in place.
  Rejected as phase 1; folded in as Task 6 gate instead (non-negotiable anyway).
