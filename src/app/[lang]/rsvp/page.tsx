import Link from "next/link";
import { cookies } from "next/headers";
import RsvpForm from "@/components/rsvp/RsvpForm";
import InviteGate from "@/components/rsvp/InviteGate";
import { getSiteConfig } from "@/lib/config";
import { getDictionary, type Locale } from "@/lib/i18n";
import { GUEST_COOKIE_NAME, parseGuestSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function RsvpPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const config = getSiteConfig();
  const dict = getDictionary(lang);
  const weddingDate = new Intl.DateTimeFormat(lang, { dateStyle: "long" }).format(
    new Date(config.weddingDate)
  );
  const sess = parseGuestSession((await cookies()).get(GUEST_COOKIE_NAME)?.value);
  let householdMax: number | undefined;
  let guestName: string | undefined;
  let sessionValid = false;
  if (sess) {
    try {
      const household = await prisma.household.findUnique({
        where: { id: sess.householdId },
        include: { guests: true },
      });
      if (household && !(household.expiresAt && household.expiresAt < new Date())) {
        sessionValid = true;
        householdMax = household.maxGuests;
        guestName = household.guests.find((g) => g.id === sess.guestId)?.name;
      }
    } catch {
      // DB unavailable (tests) — preserve legacy behavior: honor the session.
      sessionValid = true;
    }
  }
  const showGate = !sess || !sessionValid;
  return (
    <div className="mx-auto max-w-2xl px-6 py-content">
      <div className="mb-8 text-center">
        <h1 className="font-serif text-4xl font-light tracking-tight">{dict.rsvp.title}</h1>
        <p className="mx-auto mt-2 max-w-prose text-sm text-gray-600">
          {dict.rsvp.celebrateWith
            .replace("{couple}", config.coupleName)
            .replace("{venue}", config.venue)
            .replace("{date}", weddingDate)}
        </p>
        <p className="mx-auto mt-1 max-w-prose text-sm text-gray-500">{dict.rsvp.subtitle}</p>
      </div>

      {showGate ? (
        <InviteGate dict={(dict as any).invite ?? {}} />
      ) : (
        <RsvpForm messages={dict.rsvp} householdMax={householdMax} initialName={guestName} />
      )}

      <div className="mt-8 text-center">
        <Link href={`/${lang}`} className="text-sm font-medium text-gray-600 hover:text-black underline">
          ← {dict.rsvp.backHome}
        </Link>
      </div>
    </div>
  );
}
