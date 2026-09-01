import { prisma } from "@/lib/prisma";
import { StatsCards } from "@/components/admin/StatsCards";
import { GuestTable } from "@/components/admin/GuestTable";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const guests = await prisma.guest.findMany({
    include: { rsvp: true },
    orderBy: { createdAt: "desc" },
  });

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
    </div>
  );
}
