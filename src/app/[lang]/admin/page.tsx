import { cookies } from "next/headers";
import { StatsCards } from "@/components/admin/StatsCards";
import { GuestTable } from "@/components/admin/GuestTable";
import Checklist from "@/components/onboarding/Checklist";
import { guestService } from "@/lib/services/guestService";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE_NAME, parseStaffSession } from "@/lib/auth";
import { getDictionary, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type SearchParams = { page?: string; limit?: string };

export default async function AdminPage({ params, searchParams }: { params: Promise<{ lang: Locale }>; searchParams?: Promise<SearchParams> }) {
  const { lang } = await params;
  const dict = getDictionary(lang).admin;
  const query = searchParams ? await searchParams : {};
  const page = Math.max(parseInt(query.page ?? "1", 10) || 1, 1);
  const limitRaw = parseInt(query.limit ?? "50", 10) || 50;
  const limit = Math.min(Math.max(limitRaw, 1), 100);

  const { data: guests, meta } = await guestService.getPaginatedGuests({ page, limit });
  const role = parseStaffSession((await cookies()).get(ADMIN_COOKIE_NAME)?.value)?.role ?? null;
  const [responded, households] = await Promise.all([
    prisma.rsvpResponse.count().catch(() => 0),
    prisma.household.count().catch(() => 0),
  ]);

  // Serialize dates to strings for client component
  const serialized = guests.map((g) => ({
    ...g,
    createdAt: g.createdAt.toISOString(),
    rsvp: g.rsvp
      ? {
          ...g.rsvp,
          respondedAt: g.rsvp.respondedAt.toISOString(),
        }
      : null,
  }));

  const pageOf = dict.pageOf
    .replace("{page}", String(meta.page))
    .replace("{totalPages}", String(meta.totalPages))
    .replace("{total}", String(meta.total));
  const showing = dict.showing
    .replace("{shown}", String(serialized.length))
    .replace("{total}", String(meta.total));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{dict.guestManagement}</h1>
        <div className="flex items-center gap-2">
          {(role === "COUPLE" || role === "SYSADMIN") && (
            <a
              href="/api/v1/admin/gallery/export"
              className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              {dict.exportPhotos}
            </a>
          )}
          <form
            action={async () => {
              "use server";
              const { cookies } = await import("next/headers");
              const { redirect } = await import("next/navigation");
              const { ADMIN_COOKIE_NAME } = await import("@/lib/auth");
              const cookieStore = await cookies();
              cookieStore.delete(ADMIN_COOKIE_NAME);
              redirect(`/${lang}/admin/login`);
            }}
          >
            <button
              type="submit"
              className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              {dict.logout}
            </button>
          </form>
        </div>
      </div>
      <Checklist
        responded={responded}
        total={meta.total}
        codesSent={households}
        lang={lang}
        labels={{ title: dict.guestManagement, cta: dict.exportCsv }}
      />
      {role === "PLANNER" && (
        <p className="mt-4 rounded border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
          Planner view — guest management only.
        </p>
      )}
      <StatsCards
        guests={serialized as any}
        labels={{ totalGuests: dict.totalGuests, confirmed: dict.confirmed, declined: dict.declined, pending: dict.pending }}
      />
      <div className="mt-8">
        <GuestTable guests={serialized as any} lang={lang} dict={dict} />
      </div>
      {meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {pageOf}
          </span>
          <div className="flex gap-2">
            {meta.page > 1 ? (
              <a
                href={`/${lang}/admin?page=${meta.page - 1}&limit=${meta.limit}`}
                className="rounded border px-3 py-1.5 hover:bg-gray-50"
              >
                {dict.previous}
              </a>
            ) : (
              <span className="rounded border px-3 py-1.5 opacity-50">{dict.previous}</span>
            )}
            {meta.page < meta.totalPages ? (
              <a
                href={`/${lang}/admin?page=${meta.page + 1}&limit=${meta.limit}`}
                className="rounded border px-3 py-1.5 hover:bg-gray-50"
              >
                {dict.next}
              </a>
            ) : (
              <span className="rounded border px-3 py-1.5 opacity-50">{dict.next}</span>
            )}
          </div>
        </div>
      )}
      {meta.total > limit && (
        <p className="mt-2 text-xs text-gray-500">
          {showing}
        </p>
      )}
    </div>
  );
}
