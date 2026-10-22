import type { Metadata } from "next";
import Link from "next/link";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import { getDictionary, isValidLocale, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import {
  COMMERCIAL_LICENSE_HREF,
  COMMERCIAL_LICENSE_URL,
  PRICING_EMAIL,
  SELF_HOST_URL,
} from "@/lib/pricing";

const primaryButton =
  "inline-flex items-center justify-center rounded-md bg-stone-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2";

const outlineButton =
  "inline-flex items-center justify-center rounded-md border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2";

const lightButton =
  "inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900";

const darkOutlineButton =
  "inline-flex items-center justify-center rounded-md border border-stone-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = isValidLocale(raw) ? raw : "en";
  const p = getDictionary(lang).pricing;
  return {
    title: p.metaTitle,
    description: p.metaDescription,
    alternates: {
      languages: Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, `/${locale}/pricing`])),
    },
  };
}

export default async function PricingPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const dict = getDictionary(lang);
  const p = dict.pricing;

  return (
    <div>
      <section className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <p className="inline-flex rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-stone-600">
            {p.badge}
          </p>
          <h1 className="mt-6 max-w-3xl font-serif text-4xl font-light tracking-tight sm:text-5xl">
            {p.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-stone-600">{p.subtitle}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={SELF_HOST_URL} target="_blank" rel="noopener noreferrer" className={primaryButton}>
              {p.hero.primary}
            </a>
            <Link href="#business" className={outlineButton}>
              {p.hero.secondary}
            </Link>
          </div>
          <p className="mt-5 text-sm text-stone-500">{p.hero.note}</p>
        </div>
      </section>

      <section id="couples" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16 md:py-20">
        <p className="text-xs font-medium uppercase tracking-widest text-stone-500">
          {p.couples.eyebrow}
        </p>
        <h2 className="mt-3 font-serif text-3xl font-light tracking-tight sm:text-4xl">
          {p.couples.title}
        </h2>
        <p className="mt-4 max-w-2xl text-stone-600">{p.couples.subtitle}</p>
        <div className="mt-10">
          <PricingPlans dict={dict} />
        </div>
      </section>

      <section id="business" className="scroll-mt-20 bg-stone-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400">
            {p.business.eyebrow}
          </p>
          <div className="mt-3 grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="font-serif text-3xl font-light tracking-tight sm:text-4xl">
                {p.business.title}
              </h2>
              <p className="mt-4 max-w-xl leading-relaxed text-stone-300">{p.business.description}</p>
              <p className="mt-8 font-serif text-3xl font-light">{p.business.price}</p>
              <p className="mt-1 text-sm text-stone-400">{p.business.minimum}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href={COMMERCIAL_LICENSE_HREF} className={lightButton}>
                  {p.business.cta}
                </a>
                <a
                  href={COMMERCIAL_LICENSE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={darkOutlineButton}
                >
                  {p.business.secondary}
                </a>
              </div>
            </div>
            <ul className="grid content-start gap-3 text-sm text-stone-300 sm:grid-cols-2">
              {p.business.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span aria-hidden="true" className="text-stone-500">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-10 border-t border-stone-700 pt-6 text-sm text-stone-400">
            {p.business.note}
          </p>
        </div>
      </section>

      <section id="compare" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16 md:py-20">
        <h2 className="font-serif text-3xl font-light tracking-tight sm:text-4xl">{p.compare.title}</h2>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">{p.compare.title}</caption>
            <thead>
              <tr className="border-b border-stone-300">
                <th scope="col" className="py-3 pr-4 font-medium text-stone-500">
                  {p.compare.featureLabel}
                </th>
                {p.compare.columns.map((column) => (
                  <th key={column} scope="col" className="py-3 pr-4 font-medium text-stone-900">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.compare.rows.map((row) => (
                <tr key={row.label} className="border-b border-stone-200">
                  <th scope="row" className="py-4 pr-4 font-normal text-stone-500">
                    {row.label}
                  </th>
                  {row.values.map((value, index) => (
                    <td
                      key={index}
                      className={`py-4 pr-4 ${index === 1 ? "font-medium text-stone-900" : "text-stone-700"}`}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 border-y border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
          <h2 className="font-serif text-3xl font-light tracking-tight sm:text-4xl">{p.faq.title}</h2>
          <div className="mt-8 divide-y divide-stone-200 border-y border-stone-200">
            {p.faq.items.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="text-xl font-light text-stone-400 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-stone-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="rounded border border-stone-200 bg-white p-8 text-center shadow-sm md:p-12">
          <h2 className="font-serif text-3xl font-light tracking-tight sm:text-4xl">{p.final.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-stone-600">{p.final.subtitle}</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <a href={SELF_HOST_URL} target="_blank" rel="noopener noreferrer" className={primaryButton}>
              {p.final.primary}
            </a>
            <a href={`mailto:${PRICING_EMAIL}`} className={outlineButton}>
              {p.final.secondary}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
