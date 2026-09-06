import { getSiteConfig } from "@/lib/config";
import { GiftCard } from "@/components/registry/GiftCard";
import { getDictionary, type Locale } from "@/lib/i18n";

export default async function RegistryPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const config = getSiteConfig();
  const dict = getDictionary(lang);
  return (
    <div className="mx-auto max-w-3xl px-6 py-content">
      <h1 className="font-serif text-4xl font-light tracking-tight">{dict.registry.title}</h1>
      <p className="mt-2 max-w-prose text-sm text-stone-500">{dict.registry.subtitle}</p>
      <div className="mt-8">
        <GiftCard registry={config.registry} emptyTitle={dict.registry.emptyTitle} emptySubtitle={dict.registry.emptySubtitle} />
      </div>
    </div>
  );
}
