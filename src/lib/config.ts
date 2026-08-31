export type ThemeId = "classic" | "modern" | "garden";
export type SiteConfig = {
  coupleName: string;
  weddingDate: string;
  venue: string;
  theme: ThemeId;
  accentColor: string;
};
export function getSiteConfig(): SiteConfig {
  return {
    coupleName: process.env.NEXT_PUBLIC_COUPLE_NAME || "Alex & Sam",
    weddingDate: process.env.NEXT_PUBLIC_WEDDING_DATE || "2027-06-12",
    venue: process.env.NEXT_PUBLIC_VENUE || "Villa del Sol, Barcelona",
    theme: (process.env.NEXT_PUBLIC_THEME as ThemeId) || "classic",
    accentColor: process.env.NEXT_PUBLIC_ACCENT || "#b48a78",
  };
}
