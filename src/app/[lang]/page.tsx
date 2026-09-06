import { getSiteConfig } from "@/lib/config";
import { themes } from "@/lib/themes";
import { ThemeProvider } from "@/components/theme/ThemeContext";
import { getDictionary, type Locale } from "@/lib/i18n";

export default function Home({ params }: { params: { lang: Locale } }) {
  const config = getSiteConfig();
  const dict = getDictionary(params.lang);
  const theme = themes[config.theme] ?? themes.classic;
  const Component = theme.Component;
  // Provide theme tokens via context so all nested components (Button, Schedule)
  // consume styling via useTheme() — no prop drilling.
  return (
    <ThemeProvider config={config}>
      <Component config={config} lang={params.lang} dict={dict} />
    </ThemeProvider>
  );
}
