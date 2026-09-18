export default function Checklist({ responded, total, codesSent, labels }: { responded: number; total: number; codesSent: number; labels: { title: string; cta: string } }) {
  return (
    <section aria-label={labels.title} className="rounded border p-4">
      <h2 className="font-bold">{labels.title}</h2>
      <p className="text-sm text-gray-600">{responded}/{total} responded · {codesSent} codes sent</p>
      <a href="./admin?tab=guests" className="mt-2 inline-block rounded bg-black px-3 py-1.5 text-sm text-white">{labels.cta}</a>
    </section>
  );
}
