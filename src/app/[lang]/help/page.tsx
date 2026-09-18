import { getDictionary, isValidLocale } from "@/lib/i18n";

export default async function HelpPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang = isValidLocale(raw) ? raw : "en";
  const dict = getDictionary(lang);
  const h = dict.help;
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-bold">{h.title}</h1>
      <section className="mb-4 rounded border p-4">
        <h2 className="font-semibold">Guest</h2>
        <p className="text-sm text-gray-600">{h.guest}</p>
        <a href={`/${lang}/rsvp`} className="text-sm underline">RSVP</a>
      </section>
      <section className="mb-4 rounded border p-4">
        <h2 className="font-semibold">Planner</h2>
        <p className="text-sm text-gray-600">{h.planner}</p>
      </section>
      <section className="mb-4 rounded border p-4">
        <h2 className="font-semibold">Couple</h2>
        <p className="text-sm text-gray-600">{h.couple}</p>
        <a href={`/${lang}/setup`} className="mr-3 text-sm underline">Setup</a>
        <a href={`/${lang}/login`} className="text-sm underline">Login</a>
      </section>
      <section className="mb-4 rounded border p-4">
        <h2 className="font-semibold">Sysadmin</h2>
        <p className="text-sm text-gray-600">{h.sysadmin}</p>
      </section>
    </div>
  );
}
