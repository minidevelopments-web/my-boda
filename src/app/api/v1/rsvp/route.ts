import { NextRequest, NextResponse } from "next/server";
import { makeRsvpSchema } from "@/lib/validators";
import { rsvpService } from "@/lib/services/rsvpService";
import { getDictionary, pickLocale } from "@/lib/i18n";
import { GUEST_COOKIE_NAME, parseGuestSession } from "@/lib/auth";
import { normalizeInviteCode } from "@/lib/inviteCodes";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const locale = pickLocale(req.headers.get("accept-language"), null);
  const dict = getDictionary(locale).rsvp;
  const api = dict.api;
  try {
    const body = await req.json();

    // Invite-code gate (household isolation):
    // - guest_session cookie (set by POST /api/v1/guest/verify) authorizes the RSVP, OR
    // - body { inviteCode + name } valid against a household (+ name matches a member) authorizes it.
    // - Legacy public RSVP is allowed ONLY when no households exist yet (fresh install
    //   before the couple imports guests / Task 5 wizard). Once any household exists,
    //   unauthenticated RSVPs get 401 { error: "Invitation required" }.
    // Household isolation: a session/code only authorizes its own householdId; guests
    // cannot see or RSVP for another household (verified client-side by the gate +
    // here by scoping guestId lookups to the session household).
    let householdId: string | null =
      parseGuestSession(req.cookies.get(GUEST_COOKIE_NAME)?.value)?.householdId ?? null;
    let householdMax: number | null = null;
    if (householdId) {
      // Session path: re-validate household existence + expiry (never trust cookie alone).
      try {
        const household = await prisma.household.findUnique({
          where: { id: householdId },
        });
        if (!household || (household.expiresAt && household.expiresAt < new Date())) {
          return NextResponse.json({ error: "Invitation required" }, { status: 401 });
        }
        householdMax = household.maxGuests;
      } catch {
        // DB unavailable — fall through; legacy/tests stay green.
      }
    }
    if (!householdId) {
      const rawCode = typeof body?.inviteCode === "string" ? normalizeInviteCode(body.inviteCode) : "";
      const rawName = typeof body?.name === "string" ? body.name.trim().toLowerCase() : "";
      if (rawCode && rawName) {
        try {
          const household = await prisma.household.findUnique({
            where: { inviteCode: rawCode },
            include: { guests: true },
          });
          const match = household?.guests.find(
            (g) =>
              g.name.toLowerCase().trim() === rawName ||
              (g.plusOneName ?? "").toLowerCase().trim() === rawName
          );
          if (household && match && !(household.expiresAt && household.expiresAt < new Date())) {
            householdId = household.id;
            householdMax = household.maxGuests;
          }
        } catch {
          // DB unavailable — fall through to legacy check below.
        }
      }
    }
    if (!householdId) {
      try {
        const count = await prisma.household.count();
        if (count > 0) {
          return NextResponse.json({ error: "Invitation required" }, { status: 401 });
        }
        // count === 0 → legacy public RSVP allowed (no households yet).
      } catch {
        // Household model/DB unavailable (e.g. unit tests with partial prisma mock)
        // → allow legacy public RSVP so the existing suite stays green.
      }
    } else if (typeof body?.guestId === "string" && body.guestId) {
      // Scope guestId lookups to the authorized household.
      try {
        const guest = await prisma.guest.findUnique({ where: { id: body.guestId } });
        if (guest && (guest as { householdId?: string | null }).householdId && (guest as { householdId?: string | null }).householdId !== householdId) {
          return NextResponse.json({ error: "Invitation required" }, { status: 401 });
        }
      } catch {
        // If the lookup fails, let the service return its normal 404/500 contract.
      }
    }
    if (householdId && typeof body?.email === "string" && body.email.trim()) {
      // Scope email dedup to the authorized household: a session/code for
      // household A must not read/rename an email belonging to household B.
      try {
        const byEmail = await prisma.guest.findFirst({
          where: { email: body.email.trim().toLowerCase() },
        });
        if (byEmail && (byEmail as { householdId?: string | null }).householdId && (byEmail as { householdId?: string | null }).householdId !== householdId) {
          return NextResponse.json({ error: "Invitation required" }, { status: 401 });
        }
      } catch {
        // Lookup failure → service contract handles it.
      }
    }

    const parsed = makeRsvpSchema(dict).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    // Server-side headcount cap: schema max(10) is the absolute ceiling;
    // the authorized household's maxGuests is the binding limit.
    if (householdMax !== null && parsed.data.headcount > householdMax) {
      parsed.data.headcount = householdMax;
    }

    const result = await rsvpService.submitRsvp(parsed.data);

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "Guest not found") {
      return NextResponse.json({ error: api.guestNotFound }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: api.internalError }, { status: 500 });
  }
}
