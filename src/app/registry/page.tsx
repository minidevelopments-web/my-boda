import { getSiteConfig } from "@/lib/config";
import { GiftCard } from "@/components/registry/GiftCard";

export default function RegistryPage() {
  const config = getSiteConfig();
  return (
    <div className="mx-auto max-w-3xl px-6 py-content">
      <h1 className="font-serif text-4xl font-light tracking-tight">Registry</h1>
      <p className="mt-2 max-w-prose text-sm text-stone-500">Your presence is our greatest gift. For those who wish to contribute:</p>
      <div className="mt-8">
        <GiftCard registry={config.registry} />
      </div>
    </div>
  );
}
