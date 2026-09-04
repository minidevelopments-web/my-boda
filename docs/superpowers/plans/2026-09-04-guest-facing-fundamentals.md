# Guest-Facing Fundamentals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Home, RSVP, Info, Registry to typeui-fundamentals compliance via token-first foundation (fixes design debt, Admin deferred).

**Architecture:** Extend shared tokens in `globals.css` + `tailwind.config.ts` + `src/lib/theme/*` first, then apply spacing, typography, controls, RSVP UX, accessibility, responsive per surface. All components consume via `useTheme()`.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS, `next/font` (Inter + Playfair_Display), `ThemeContext` tokens, Zod `rsvpSchema`, `gh` CLI for issues.

## Global Constraints

- Scope is guest-facing only: `src/app/{page,layout,rsvp,info,registry}` + `src/components/{layout,themes,rsvp,registry,info,ui,theme}` + `src/lib/theme/*` + `globals.css` + `tailwind.config.ts` — never touch `src/app/admin`, `GuestTable`, `StatsCards`, API, DB, auth.
- Fundamentals order is mandatory: tokens → spacing → UI → typography; accessibility non-negotiable on every task.
- On token vs principle conflict, the token value wins; flag the conflict in the issue/PR body.
- Verify every task with `npx tsc --noEmit`, plus `npm test` and `npm run build` where noted.
- One conventional commit per task: `refactor(design): ...`, `fix(a11y): ...`, `chore(design): ...` with issue number.

---

### Task 1: Token foundation

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`
- Modify: `src/lib/theme/types.ts`
- Modify: `src/lib/theme/tokens.ts`
- Test: `npx tsc --noEmit`

**Interfaces:**
- Consumes: current `ThemeTokens` (colors, typography, radius) and 17-line `globals.css`.
- Produces: CSS vars + Tailwind mappings + extended `ThemeTokens` that Tasks 2–7 consume (spacing tiers, type scale, radius, shadows). No visual change yet.

- [ ] **Step 1: Create GitHub issue**

Run: `gh issue create --title "chore(design): guest-facing token foundation" --body "Extend globals.css + tailwind.config + ThemeTokens with spacing tiers, type scale, radius, shadows. No page changes. Acceptance: tsc passes, tokens documented in issue." --label enhancement`
Expected: new issue URL printed (note the number for commit trailers).

- [ ] **Step 2: Add CSS vars to globals.css**

In `src/app/globals.css`, keep existing `:root` block and append tier vars (exact names agents must use downstream):
```css
:root {
  --space-section: 6rem;
  --space-content: 4rem;
  --space-block: 2rem;
  --space-inline: 1rem;
  --radius-card: var(--theme-radius-card, 0px);
  --radius-button: var(--theme-radius-button, 0px);
  --shadow-card: 0 1px 2px rgba(0,0,0,0.05);
}
```

- [ ] **Step 3: Map vars in tailwind.config.ts**

In `theme.extend`, add:
```ts
spacing: {
  section: "var(--space-section)",
  content: "var(--space-content)",
  block: "var(--space-block)",
},
borderRadius: {
  card: "var(--radius-card)",
  button: "var(--radius-button)",
},
boxShadow: {
  card: "var(--shadow-card)",
},
```

- [ ] **Step 4: Extend ThemeTokens types**

In `src/lib/theme/types.ts` add:
```ts
export type ThemeSpacing = { section: string; content: string; block: string };
export type ThemeShadows = { card: string };
```
And extend `ThemeTokens` with `spacing: ThemeSpacing; shadows: ThemeShadows;`.

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css tailwind.config.ts src/lib/theme/types.ts src/lib/theme/tokens.ts
git commit -m "chore(design): guest-facing token foundation (#ISSUE)"
```
Replace `#ISSUE` with the number from Step 1.

### Task 2: Spacing rhythm

**Files:**
- Modify: `src/components/themes/ClassicElegance.tsx`, `src/components/themes/GardenRomance.tsx`, `src/components/themes/ModernMinimal.tsx`
- Modify: `src/app/rsvp/page.tsx`, `src/app/info/page.tsx`, `src/app/registry/page.tsx`
- Test: `npx tsc --noEmit` + manual 360/768/1280px check

**Interfaces:**
- Consumes: Task 1 spacing vars (`section/content/block`).
- Produces: consistent section tiers across all guest surfaces; later tasks assume no ad-hoc `py-24/py-32/py-16/py-12/py-8` remain on these files.

- [ ] **Step 1: Create GitHub issue**

Run: `gh issue create --title "refactor(spacing): 4pt rhythm on guest surfaces" --body "Replace ad-hoc py-*/max-w-* with section/content/block tiers on Home themes + RSVP/Info/Registry pages. Acceptance: no ad-hoc section padding left, viewports 360/768/1280 verified." --label enhancement`
Expected: issue URL printed.

- [ ] **Step 2: Replace hero paddings**

In each theme hero `<section>`, replace `py-24 md:py-32` / `py-20 md:py-28` with `py-content md:py-section`, and content sections `py-16` with `py-content`, `pb-16` with `pb-content`. Keep `px-6` inline rhythm unchanged.

- [ ] **Step 3: Unify page containers**

`rsvp/page.tsx` `py-12` → `py-content`; `info/page.tsx` `py-12` → `py-content`; `registry/page.tsx` `py-12` → `py-content`. Keep `max-w-*` as-is in this task (containers standardized in Task 7).

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: exit 0.
Run: `grep -rn "py-24\|py-32\|py-20\|py-28\|py-16" src/components/themes src/app/rsvp src/app/info src/app/registry || echo "no-match"`
Expected: `no-match`.

- [ ] **Step 5: Commit**

```bash
git add src/components/themes src/app/rsvp src/app/info src/app/registry
git commit -m "refactor(spacing): 4pt rhythm on guest surfaces (#ISSUE)"
```

### Task 3: Typography scale

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/components/themes/ClassicElegance.tsx`, `GardenRomance.tsx`, `ModernMinimal.tsx`
- Modify: `src/app/rsvp/page.tsx`, `src/app/info/page.tsx`, `src/app/registry/page.tsx`
- Test: `npx tsc --noEmit`

**Interfaces:**
- Consumes: Task 1 type vars; single font source from `layout.tsx`.
- Produces: one H1/H2/body/caption scale, no per-theme `next/font` init, `max-w-prose` on paragraphs.

- [ ] **Step 1: Create GitHub issue**

Run: `gh issue create --title "refactor(typography): single font load + modular scale" --body "Dedupe next/font to layout.tsx, define H1/H2/body/caption scale, apply max-w-prose measure. Acceptance: no Playfair/Inter init outside layout, tsc passes." --label enhancement`
Expected: issue URL printed.

- [ ] **Step 2: Delete per-theme font init**

Delete these lines from `ClassicElegance.tsx`, `GardenRomance.tsx`:
```ts
import { Playfair_Display, Inter } from "next/font/google";
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
```
And from `ModernMinimal.tsx`:
```ts
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
```
Remove `${playfair.variable} ${inter.variable}` / `${inter.variable}` from wrapper `className`, keeping token-driven `style={{ fontFamily: tokens.typography.headingFont }}`.

- [ ] **Step 3: Standardize headings**

Home H1 keeps theme size but uses `font-serif` + token family; `info/page.tsx`, `registry/page.tsx`, `rsvp/page.tsx` H1 → `font-serif text-4xl font-light tracking-tight`; section H2 → `text-lg font-semibold`. Body paragraphs get `max-w-prose`.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: exit 0.
Run: `grep -rn "next/font" src/components/themes || echo "no-match"`
Expected: `no-match`.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/components/themes src/app/rsvp src/app/info src/app/registry
git commit -m "refactor(typography): single font load and scale (#ISSUE)"
```

### Task 4: Unified controls

**Files:**
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/rsvp/RsvpForm.tsx` (submit button only)
- Test: `npx tsc --noEmit` + keyboard focus check

**Interfaces:**
- Consumes: Task 1 radius/shadow tokens + `ThemeContext`.
- Produces: `Button` supporting `<a>` and `<button>` with loading/disabled states; RSVP submit uses it. Tasks 5–6 assume focus-visible rings everywhere.

- [ ] **Step 1: Create GitHub issue**

Run: `gh issue create --title "refactor(ui): unify Button and form control states" --body "Extend ui/Button to button element + loading/disabled, apply nested-radius and input-contrast rules, replace raw RSVP submit. Acceptance: keyboard focus visible on all controls, tsc passes." --label enhancement`
Expected: issue URL printed.

- [ ] **Step 2: Extend Button to button element**

In `src/components/ui/Button.tsx`, change props to:
```tsx
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    variant?: "primary" | "secondary";
    accentColor?: string;
    loading?: boolean;
    href?: string;
  };
```
Render `<a>` when `href` is set, else `<button disabled={disabled || loading}>` with `aria-busy={loading}` and label `{loading ? "Sending..." : children}` pattern for submit usage. Keep `focus-visible:ring-2 ring-offset-2` and `disabled:opacity-50` classes.

- [ ] **Step 3: Replace raw RSVP submit**

In `src/components/rsvp/RsvpForm.tsx`, replace the raw `<button type="submit" className="w-full rounded-md bg-black ...">` with `<Button type="submit" loading={submitting} className="w-full">Send RSVP</Button>` importing from `@/components/ui/Button`.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Button.tsx src/components/rsvp/RsvpForm.tsx
git commit -m "refactor(ui): unify Button and control states (#ISSUE)"
```

### Task 5: RSVP UX contracts

**Files:**
- Modify: `src/components/rsvp/RsvpForm.tsx`
- Modify: `src/app/rsvp/page.tsx`
- Test: `npx tsc --noEmit` + `npm test` + keyboard-only submit

**Interfaces:**
- Consumes: Task 4 `Button`; existing `rsvpSchema.safeParse` + `POST /api/v1/rsvp` flow unchanged.
- Produces: human errors, error-summary focus, success focus, 44px targets. Task 6 builds a11y audit on top.

- [ ] **Step 1: Create GitHub issue**

Run: `gh issue create --title "fix(rsvp-ux): error clarity, focus, touch targets" --body "Human submitError copy, error-summary + success focus management, 44px radio/checkbox targets, no layout jump on conditionals. API flow unchanged. Acceptance: keyboard-only submit announces errors/success." --label enhancement`
Expected: issue URL printed.

- [ ] **Step 2: Humanize submitError**

Replace `const msg = json?.error ? JSON.stringify(json.error) : "Failed to submit RSVP";` with:
```ts
const msg =
  typeof json?.error === "string"
    ? json.error
    : "Something went wrong sending your RSVP. Please check your details and try again.";
```

- [ ] **Step 3: Add error-summary focus + 44px targets**

Add an error-summary `<div role="alert" tabIndex={-1} ref={summaryRef}>` listing `Object.values(errors)` when non-empty, and call `summaryRef.current?.focus()` after failed validation. Add `min-h-[44px] min-w-[44px]` to attending radio labels and plus-one checkbox label. Add `aria-live="polite"` success heading focus via `successRef.current?.focus()` on success.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: exit 0.
Run: `npm test`
Expected: pass (no suite covers RsvpForm; ensures no regression).

- [ ] **Step 5: Commit**

```bash
git add src/components/rsvp/RsvpForm.tsx src/app/rsvp/page.tsx
git commit -m "fix(rsvp-ux): error clarity, focus, targets (#ISSUE)"
```

### Task 6: Accessibility pass

**Files:**
- Modify: `src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx`
- Modify: `src/components/themes/*`, `src/components/info/Schedule.tsx`, `src/app/rsvp/page.tsx`
- Test: `npx tsc --noEmit` + manual screen-reader/keyboard checklist

**Interfaces:**
- Consumes: Tasks 1–5 output.
- Produces: WCAG gate — skip link, `aria-current`, list semantics, hidden decoratives, contrast/focus/motion verified. Blocks merge on violation.

- [ ] **Step 1: Create GitHub issue**

Run: `gh issue create --title "fix(a11y): guest-facing WCAG pass" --body "Skip link, aria-current nav, list semantics, aria-hidden decoratives, contrast + focus-visible + reduced-motion audit on Home/RSVP/Info/Registry. Acceptance: keyboard-only + screen-reader names verified, no new violations." --label enhancement`
Expected: issue URL printed.

- [ ] **Step 2: Add skip link + aria-current**

In `src/app/layout.tsx`, insert before `<Header>`:
```tsx
<a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
```
Change `<main className=...>` to `<main id="main" className=...>`. In `Header.tsx`, add `aria-current="page"` to the link matching the current route (use `usePathname()` from `next/navigation`, client component).

- [ ] **Step 3: Fix semantics + decoratives**

Convert Schedule/timeline wrapper `div.relative.border-l` items to `<ul><li>`; add `aria-hidden="true"` to diamond/✿/divider spans in all three themes; ensure badge-like venue pill in `GardenRomance` stays inline content-sized (never full-width).

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: exit 0.
Manual: Tab from top reveals skip link; nav announces current page; timeline reads as list; decoratives silent.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/components/layout src/components/themes src/components/info src/app/rsvp
git commit -m "fix(a11y): guest-facing WCAG pass (#ISSUE)"
```

### Task 7: Responsive containers

**Files:**
- Modify: `src/components/themes/*`, `src/app/rsvp/page.tsx`, `src/app/info/page.tsx`, `src/app/registry/page.tsx`
- Test: `npm run build` + 360/768/1280px check

**Interfaces:**
- Consumes: Tasks 1–6 output.
- Produces: unified container scale; final visual gate before Admin follow-up.

- [ ] **Step 1: Create GitHub issue**

Run: `gh issue create --title "chore(responsive): consistent guest containers" --body "Unify max-w containers, hero stack, map placeholder, form rhythm at 360/768/1280. Acceptance: build passes, no horizontal overflow on any guest route × 3 themes." --label enhancement`
Expected: issue URL printed.

- [ ] **Step 2: Standardize containers**

Home heroes: `max-w-5xl` (classic/garden) and `max-w-6xl` (modern) stay per-theme by design; Info `max-w-5xl`, Registry `max-w-3xl`, RSVP `max-w-2xl` stay. Ensure every container uses `px-6` and section tiers from Task 2. Map placeholder `h-64` gains `min-h-[16rem]` + responsive `md:min-h-[20rem]`.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: exit 0, no overflow warnings; guest routes render.

- [ ] **Step 4: Commit and push plan**

```bash
git add src/components/themes src/app/rsvp src/app/info src/app/registry
git commit -m "chore(responsive): consistent guest containers (#ISSUE)"
```
