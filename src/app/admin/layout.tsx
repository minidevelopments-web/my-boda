import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, ADMIN_COOKIE_NAME } from "@/lib/auth";

/**
 * Admin layout guard.
 * Primary authorization is handled by `middleware.ts` (edge, single source of truth)
 * which redirects unauthenticated requests to `/admin/login` before this
 * layout ever renders. This check remains as defense-in-depth for
 * direct server-component rendering and local tests that bypass middleware.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    redirect("/admin/login");
  }
  return <>{children}</>;
}
