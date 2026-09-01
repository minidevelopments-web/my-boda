# Themes Guide — my-boda

## How Themes Work

The landing page (`src/app/page.tsx`) reads `SiteConfig` (from env via `src/lib/config.ts`) and renders the theme component selected by `config.theme`. Themes are purely presentational — they share the same data (couple name, countdown, venue, etc.) and no theme touches the database.

```
src/lib/config.ts      → getSiteConfig(): SiteConfig  (env → typed object)
src/lib/themes.ts      → themes registry + ThemeDef type
src/components/themes/ → ClassicElegance.tsx, ModernMinimal.tsx, GardenRomance.tsx
src/app/page.tsx       → picks themes[config.theme].Component and renders <Component config={config} />
```

Switching themes is a one-line env change — no content rewrite.

## ThemeDef Shape

Defined in `src/lib/themes.ts`:

```ts
import type { FC } from "react";
import type { SiteConfig, ThemeId } from "@/lib/config";

export type ThemeId = "classic" | "modern" | "garden";

export type ThemeDef = {
  id: ThemeId;
  label: string;                          // Human label for UI
  Component: FC<{ config: SiteConfig }>;   // Theme component
  preview: string;                        // Preview swatch color (hex)
};

export const themes: Record<ThemeId, ThemeDef> = {
  classic: { id: "classic", label: "Classic Elegance", Component: ClassicElegance, preview: "#fdfbf7" },
  modern:  { id: "modern",  label: "Modern Minimal",  Component: ModernMinimal,  preview: "#ffffff" },
  garden:  { id: "garden",  label: "Garden Romance",  Component: GardenRomance,  preview: "#fbf7f3" },
};
```

`SiteConfig` (from `src/lib/config.ts`) carries:

```ts
type SiteConfig = {
  coupleName: string;
  weddingDate: string;   // YYYY-MM-DD
  venue: string;
  theme: ThemeId;
  accentColor: string;   // hex
  schedule: ScheduleItem[];
  venueMapUrl: string;
  accommodations: Accommodation[];
  registry: RegistryConfig;
};
```

Theme components receive `config` and may use `accentColor`, `preview`, etc., for styling.

## How to Add a New Theme

Example: adding a `boho` theme.

### 1. Extend the ThemeId union

`src/lib/config.ts`:

```ts
export type ThemeId = "classic" | "modern" | "garden" | "boho";
```

### 2. Create the component

`src/components/themes/BohoChic.tsx`:

```tsx
import type { SiteConfig } from "@/lib/config";

export default function BohoChic({ config }: { config: SiteConfig }) {
  return (
    <main style={{ ["--accent" as string]: config.accentColor }}>
      <section>
        <h1>{config.coupleName}</h1>
        <p>{config.venue} — {config.weddingDate}</p>
        {/* build your layout */}
      </section>
    </main>
  );
}
```

Use `config.coupleName`, `config.weddingDate`, `config.venue`, `config.accentColor`, `config.schedule`, `config.accommodations`, `config.registry`, `config.venueMapUrl` as needed. Keep the component self-contained — no extra data fetching required.

### 3. Register it

`src/lib/themes.ts`:

```ts
import BohoChic from "@/components/themes/BohoChic";

export const themes: Record<ThemeId, ThemeDef> = {
  classic: { /* ... */ },
  modern:  { /* ... */ },
  garden:  { /* ... */ },
  boho:    { id: "boho", label: "Boho Chic", Component: BohoChic, preview: "#faf6f0" },
};
```

### 4. Verify

```bash
npm run build   # must pass — ensures ThemeId union and registry stay in sync
```

Add a GIF preview at `docs/assets/theme-boho.gif` and update `README.md` themes table.

## Env Switching

Set the active theme via env:

```bash
# .env
NEXT_PUBLIC_THEME="boho"
```

`NEXT_PUBLIC_THEME` is **build-time** inlined. After changing it, rebuild:

```bash
# Local
npm run build && npm start

# Docker
docker compose up --build -d
```

Valid values are exactly the `ThemeId` union (`classic` | `modern` | `garden` | plus any you added). An unknown value falls back to `classic` via `getSiteConfig()`.

Accent color is independent — override per deploy without touching theme code:

```
NEXT_PUBLIC_ACCENT="#c9a87a"
```

## Tips

- Keep themes accessible — test contrast for `accentColor` on `preview` background.
- Share common sections (Header/Footer/Countdown) via `src/components/` if you want — current themes are fully standalone for easy forking.
- GIFs: record at 800×450, ~5s loop, optimize with `gifsicle` or `ffmpeg` before committing.

