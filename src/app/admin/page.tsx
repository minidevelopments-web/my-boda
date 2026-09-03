import { StatsCards } from "@/components/admin/StatsCards";
import { GuestTable } from "@/components/admin/GuestTable";
import { guestService } from "@/lib/services/guestService";

export const dynamic = "force-dynamic";

type SearchParams = { page?: string; limit?: string };

export default async function AdminPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const page = Math.max(parseInt(params.page ?? "1", 10) || 1, 1);
  const limitRaw = parseInt(params.limit ?? "50", 10) || 50;
  const limit = Math.min(Math.max(limitRaw, 1), 100);

  const { data: guests, meta } = await guestService.getPaginatedGuests({ page, limit });

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

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Guest Management</h1>
        <form
          action={async () => {
            "use server";
            const { cookies } = await import("next/headers");
            const { redirect } = await import("next/navigation");
            const { ADMIN_COOKIE_NAME } = await import("@/lib/auth");
            const cookieStore = await cookies();
            cookieStore.delete(ADMIN_COOKIE_NAME);
            redirect("/admin/login");
          }}
        >
          <button
            type="submit"
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Logout
          </button>
        </form>
      </div>
      <StatsCards guests={serialized as any} />
      <div className="mt-8">
        <GuestTable guests={serialized as any} />
      </div>
      {meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Page {meta.page} of {meta.totalPages} — {meta.total} guests total
          </span>
          <div className="flex gap-2">
            {meta.page > 1 ? (
              <a
                href={`/admin?page=${meta.page - 1}&limit=${meta.limit}`}
                className="rounded border px-3 py-1.5 hover:bg-gray-50"
              >
                Previous
              </a>
            ) : (
              <span className="rounded border px-3 py-1.5 opacity-50">Previous</span>
            )}
            {meta.page < meta.totalPages ? (
              <a
                href={`/admin?page=${meta.page + 1}&limit=${meta.limit}`}
                className="rounded border px-3 py-1.5 hover:bg-gray-50"
              >
                Next
              </a>
            ) : (
              <span className="rounded border px-3 py-1.5 opacity-50">Next</span>
            )}
          </div>
        </div>
      )}
      {meta.total > limit && (
        <p className="mt-2 text-xs text-gray-500">
          Showing {serialized.length} of {meta.total} guests. Use pagination to view all.
        </p>
      )}
    </div>
  );
}
