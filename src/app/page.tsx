import { getSiteConfig } from "@/lib/config";
import { themes } from "@/lib/themes";

export default function Home() {
  const config = getSiteConfig();
  const theme = themes[config.theme] ?? themes.classic;
  const Component = theme.Component;
  return <Component config={config} />;
}
