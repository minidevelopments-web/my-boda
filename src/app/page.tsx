import { getSiteConfig } from "@/lib/config";
import { themes } from "@/lib/themes";
import { ThemeProvider } from "@/components/theme/ThemeContext";

export default function Home() {
  const config = getSiteConfig();
  const theme = themes[config.theme] ?? themes.classic;
  const Component = theme.Component;
  // Provide theme tokens via context so all nested components (Button, Schedule)
  // consume styling via useTheme() — no prop drilling.
  return (
    <ThemeProvider config={config}>
      <Component config={config} />
    </ThemeProvider>
  );
}
