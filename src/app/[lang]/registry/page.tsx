import { getSiteConfig } from "@/lib/config";
import { GiftCard } from "@/components/registry/GiftCard";
import { getDictionary, type Locale } from "@/lib/i18n";

export default function RegistryPage({ params }: { params: { lang: Locale } }) {
  const config = getSiteConfig();
  const dict = getDictionary(params.lang);
  return (
    <div className="mx-auto max-w-3xl px-6 py-content">
      <h1 className="font-serif text-4xl font-light tracking-tight">{dict.registry.title}</h1>
      <p className="mt-2 max-w-prose text-sm text-stone-500">Your presence is our greatest gift. For those who wish to contribute:</p>
      <div className="mt-8">
        <GiftCard registry={config.registry} />
      </div>
    </div>
  );
}
