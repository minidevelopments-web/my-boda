import Link from "next/link";
import RsvpForm from "@/components/rsvp/RsvpForm";
import { getSiteConfig } from "@/lib/config";

export default function RsvpPage() {
  const config = getSiteConfig();
  return (
    <div className="mx-auto max-w-2xl px-6 py-content">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">RSVP</h1>
        <p className="mt-2 text-sm text-gray-600">
          Celebrate with {config.coupleName} — {config.venue} on {config.weddingDate}
        </p>
        <p className="mt-1 text-sm text-gray-500">Let us know if you can make it. We can&apos;t wait to see you!</p>
      </div>

      <RsvpForm />

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm font-medium text-gray-600 hover:text-black underline">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
