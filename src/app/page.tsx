import { getSiteConfig } from "@/lib/config";

export default function Home() {
  const config = getSiteConfig();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
        {config.coupleName}
      </h1>
      <p className="mt-4 text-lg text-gray-600">
        {config.weddingDate} — {config.venue}
      </p>
      <p className="mt-2 text-sm text-gray-500">Theme: {config.theme}</p>
      <div className="mt-8 flex gap-4">
        <a
          href="/rsvp"
          className="rounded-md px-6 py-3 text-white font-medium"
          style={{ backgroundColor: config.accentColor }}
        >
          RSVP
        </a>
        <a
          href="/info"
          className="rounded-md border px-6 py-3 font-medium"
        >
          Info
        </a>
      </div>
      <footer className="mt-16 text-sm text-gray-400">
        Created with My Boda — Open Source Wedding Platform
      </footer>
    </main>
  );
}
