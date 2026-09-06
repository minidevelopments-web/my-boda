import "./globals.css";

/**
 * Root layout stays minimal: the localized <html>/<body> shell lives in
 * `src/app/[lang]/layout.tsx`. Next.js forbids nested <html> tags, so this
 * layout only passes children through (middleware redirects "/" to /{lang}).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
