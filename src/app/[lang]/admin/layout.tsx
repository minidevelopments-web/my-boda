import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, parseStaffSession } from "@/lib/auth";
import { isValidLocale } from "@/lib/i18n";

/**
 * Admin layout guard + role-gated nav.
 * Primary authorization is handled by `middleware.ts` (edge, single source of truth).
 * This check remains as defense-in-depth for direct server-component rendering.
 */
export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang = isValidLocale(raw) ? raw : "en";
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const sess = parseStaffSession(token);
  if (!sess) {
    redirect(`/${lang}/login`);
  }
  const role = sess.role ?? null;
  const isSysadmin = role === "SYSADMIN";
  return (
    <>
      <nav aria-label="Admin" className="border-b">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3 text-sm">
          <a href={`/${lang}/admin`} className="font-medium">Guests</a>
          {isSysadmin && <a href={`/${lang}/admin/system`} className="text-gray-600">System</a>}
          {isSysadmin && <a href={`/${lang}/admin?tab=users`} className="text-gray-600">Users</a>}
          <span className="ml-auto text-gray-500">{role?.toLowerCase()}</span>
        </div>
      </nav>
      {role === "PLANNER" && (
        <p className="bg-yellow-50 px-6 py-2 text-center text-sm text-yellow-800">
          Planner access — limited: no users or system settings.
        </p>
      )}
      {children}
    </>
  );
}
