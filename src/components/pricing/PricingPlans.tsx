import type { Dictionary } from "@/lib/i18n";
import { HOSTED_ORDER_HREF, PREMIUM_ORDER_HREF, SELF_HOST_URL } from "@/lib/pricing";

const outlineButton =
  "inline-flex w-full items-center justify-center rounded-md border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2";

const primaryButton =
  "inline-flex w-full items-center justify-center rounded-md bg-stone-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2";

const lightButton =
  "inline-flex w-full items-center justify-center rounded-md bg-white px-5 py-3 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900";

export function PricingPlans({ dict }: { dict: Dictionary }) {
  const p = dict.pricing;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <article className="flex flex-col rounded border border-stone-200 bg-white p-8 shadow-sm">
        <h3 className="text-lg font-semibold">{p.selfHost.name}</h3>
        <p className="mt-4 flex items-baseline gap-2">
          <span className="font-serif text-4xl font-light">{p.selfHost.price}</span>
          {p.selfHost.period && <span className="text-sm text-stone-500">{p.selfHost.period}</span>}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">{p.selfHost.description}</p>
        <ul className="mt-6 space-y-2 text-sm text-stone-700">
          {p.selfHost.features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <span aria-hidden="true" className="text-stone-400">✓</span>
              {feature}
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-8">
          <a href={SELF_HOST_URL} target="_blank" rel="noopener noreferrer" className={outlineButton}>
            {p.selfHost.cta}
          </a>
          <p className="mt-4 text-xs leading-relaxed text-stone-500">{p.selfHost.note}</p>
        </div>
      </article>

      <article className="relative flex flex-col rounded border-2 border-stone-900 bg-white p-8 shadow-sm">
        <span className="absolute -top-3 left-8 rounded-full bg-stone-900 px-3 py-1 text-xs font-medium text-white">
          {p.hosted.badge}
        </span>
        <h3 className="text-lg font-semibold">{p.hosted.name}</h3>
        <p className="mt-4 flex items-baseline gap-2">
          <span className="font-serif text-4xl font-light">{p.hosted.price}</span>
          <span className="text-sm text-stone-500">{p.hosted.period}</span>
        </p>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">{p.hosted.description}</p>
        <ul className="mt-6 space-y-2 text-sm text-stone-700">
          {p.hosted.features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <span aria-hidden="true" className="text-stone-400">✓</span>
              {feature}
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-8">
          <a href={HOSTED_ORDER_HREF} className={primaryButton}>
            {p.hosted.cta}
          </a>
          <p className="mt-4 text-xs leading-relaxed text-stone-500">{p.hosted.note}</p>
        </div>
      </article>

      <article className="relative flex flex-col rounded bg-stone-900 p-8 text-white shadow-sm">
        <span className="absolute -top-3 left-8 rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-900">
          {p.premium.badge}
        </span>
        <h3 className="text-lg font-semibold">{p.premium.name}</h3>
        <p className="mt-4 flex items-baseline gap-2">
          <span className="font-serif text-4xl font-light">{p.premium.price}</span>
          <span className="text-sm text-stone-400">{p.premium.period}</span>
        </p>
        <p className="mt-3 text-sm leading-relaxed text-stone-300">{p.premium.description}</p>
        <ul className="mt-6 space-y-2 text-sm text-stone-300">
          {p.premium.features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <span aria-hidden="true" className="text-stone-500">✓</span>
              {feature}
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-8">
          <a href={PREMIUM_ORDER_HREF} className={lightButton}>
            {p.premium.cta}
          </a>
          <p className="mt-4 text-xs leading-relaxed text-stone-400">{p.premium.note}</p>
        </div>
      </article>
    </div>
  );
}
