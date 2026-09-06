import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { pickLocale } from "@/lib/i18n";

/**
 * Root redirector (defense-in-depth: middleware already redirects "/" to
 * /{lang} at the edge, this covers direct server-component rendering).
 * Async cookies()/headers() per Next 15+ request APIs.
 */
export default async function RootPage() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("locale")?.value ?? null;
  const headerStore = await headers();
  const al = headerStore.get("accept-language");
  redirect(`/${pickLocale(al, cookie)}`);
}
