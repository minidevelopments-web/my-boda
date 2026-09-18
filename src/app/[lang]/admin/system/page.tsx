import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, parseStaffSession } from "@/lib/auth";
import { isValidLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function presence(v: string | undefined): string {
  return v ? "SET" : "MISSING";
}

export default async function SystemPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang = isValidLocale(raw) ? raw : "en";
  const sess = parseStaffSession((await cookies()).get(ADMIN_COOKIE_NAME)?.value);
  if (sess?.role !== "SYSADMIN") redirect(`/${lang}/login`);

  const t0 = Date.now();
  let dbStatus = "OK";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "ERROR";
  }
  const latencyMs = Date.now() - t0;
  const users = await prisma.user.findMany({
    select: { email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  }).catch(() => []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">System</h1>
      <section aria-label="Environment" className="mb-6 rounded border p-4">
        <h2 className="mb-2 font-bold">Environment</h2>
        <ul className="text-sm">
          <li>ADMIN_PASSWORD: {presence(process.env.ADMIN_PASSWORD)}</li>
          <li>DATABASE_URL: {presence(process.env.DATABASE_URL)}</li>
          <li>POSTGRES_URL: {presence(process.env.POSTGRES_URL)}</li>
        </ul>
      </section>
      <section aria-label="Database" className="mb-6 rounded border p-4">
        <h2 className="mb-2 font-bold">Database health</h2>
        <p className="text-sm">Status: {dbStatus} · latency: {latencyMs}ms</p>
      </section>
      <section aria-label="Users" className="mb-6 rounded border p-4">
        <h2 className="mb-2 font-bold">Users ({users.length})</h2>
        <ul className="text-sm">
          {users.map((u) => (
            <li key={u.email}>{u.email} — {u.role}</li>
          ))}
        </ul>
      </section>
      <section aria-label="Backups" className="rounded border p-4">
        <h2 className="mb-2 font-bold">Backups</h2>
        <p className="text-sm text-gray-600">Audit auth events in server logs; back up with:</p>
        <code className="mt-1 block rounded bg-gray-50 px-3 py-2 text-sm">pg_dump $DATABASE_URL &gt; backup.sql</code>
      </section>
    </div>
  );
}
