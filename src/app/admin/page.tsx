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
            // clear cookie via server action by setting empty and redirect
            // We cannot directly set cookies in server action without NextResponse, use redirect to login and client logout
            redirect("/admin/login");
          }}
        >
        </form>
      </div>
      <StatsCards guests={serialized as any} />
      <div className="mt-8">
        <GuestTable guests={serialized as any} />
      </div>
    </div>
  );
}
