import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, ADMIN_COOKIE_NAME } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";

/**
 * Admin layout guard.
 * Primary authorization is handled by `middleware.ts` (edge, single source of truth)
 * which redirects unauthenticated requests to `/{lang}/admin/login` before this
 * layout ever renders. This check remains as defense-in-depth for
 * direct server-component rendering and local tests that bypass middleware.
 */
export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: { lang: Locale } }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    redirect(`/${params.lang}/admin/login`);
  }
  return <>{children}</>;
}
