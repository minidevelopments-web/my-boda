import { prisma } from "@/lib/prisma";
import { guestRepository } from "@/lib/repositories/guestRepository";
import { rsvpRepository } from "@/lib/repositories/rsvpRepository";
import type { RsvpInput } from "@/lib/validators";

/**
 * RsvpService — encapsulates the full submit-RSVP transaction.
 *
 * Previously this logic lived directly in `src/app/api/rsvp/route.ts`
 * and coupled the API layer to Prisma's transaction API. Now the route
 * only validates + delegates; all DB semantics (dedup, headcount
 * coercion, email normalization, upsert) live here.
 *
 * The transactional boundary is still `prisma.$transaction`; swapping
 * the DB only requires updating this service + repositories.
 */

function normalizeEmailInput(email: unknown): string | null | undefined {
  if (email === undefined) return undefined;
  if (email === null || email === "") return null;
  const trimmed = String(email).trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

export const rsvpService = {
  /**
   * Submit / upsert an RSVP. Handles:
   * - effectiveHeadcount coercion (1 when not attending)
   * - meal/dietary nulling when not attending
   * - guest lookup by guestId or by normalized email dedup
   * - guest create / update
   * - RSVP upsert
   *
   * Throws Error("Guest not found") when guestId is provided but missing,
   * to preserve the previous API 404 contract.
   *
   * DB note: `prisma.$transaction` on SQLite (better-sqlite3) is single-writer
   * and serialized via file lock — safe for single-container deploys but will
   * serialize concurrent RSVP submissions. For high concurrency switch provider
   * to "postgresql" in prisma/schema.prisma and use the postgres service in
   * docker-compose.yml (see Dockerfile header and schema comments).
   */
  async submitRsvp(input: RsvpInput) {
    const { name, email, attending, headcount, mealChoice, dietaryNotes, message, guestId, category, plusOne, plusOneName } = input;

    const effectiveHeadcount = attending ? headcount : 1;
    const effectiveMealChoice = attending ? mealChoice || null : null;
    const effectiveDietaryNotes = attending ? dietaryNotes || null : null;

    const result = await prisma.$transaction(async (tx) => {
      let guest: { id: string } & Record<string, unknown>;

      if (guestId) {
        // Direct guestId path — verify existence via transaction client
        const existing = await guestRepository.findById(guestId, tx);
        if (!existing) {
          throw new Error("Guest not found");
        }
        const normalizedEmail = normalizeEmailInput(email);
        guest = await guestRepository.updateFlat(
          guestId,
          {
            ...(name ? { name } : {}),
            ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
            ...(category ? { category } : {}),
            ...(plusOne !== undefined ? { plusOne } : {}),
            ...(plusOneName !== undefined ? { plusOneName: plusOneName || null } : {}),
          },
          tx
        ) as typeof guest;
      } else {
        const emailValue = normalizeEmailInput(email) ?? null;
        // Normalize empty string sentinel from validator: "" -> null already
        const normalizedForLookup = emailValue === null ? null : emailValue;

        if (normalizedForLookup) {
          const found = await guestRepository.findByEmail(normalizedForLookup, tx);
          guest = (found as typeof guest) || null;
        } else {
          guest = null as unknown as typeof guest;
        }

        if (!guest) {
          try {
            guest = (await guestRepository.createFlat(
              {
                name,
                email: normalizedForLookup as string | null,
                category: category || "family",
                plusOne: plusOne || false,
                plusOneName: plusOneName || null,
              },
              tx
            )) as typeof guest;
          } catch (e: unknown) {
            // Handle race: concurrent insert with same email violates @@unique([email])
            const isUniqueViolation =
              e !== null &&
              typeof e === "object" &&
              (("code" in e && (e as { code: string }).code === "P2002") ||
                ("message" in e && String((e as { message: string }).message).includes("Unique constraint")));
            if (isUniqueViolation && normalizedForLookup) {
              const found = await guestRepository.findByEmail(normalizedForLookup, tx);
              if (found) {
                guest = (await guestRepository.updateFlat(
                  (found as { id: string }).id,
                  {
                    name,
                    ...(plusOne !== undefined ? { plusOne } : {}),
                    ...(plusOneName !== undefined ? { plusOneName: plusOneName || null } : {}),
                    ...(category ? { category } : {}),
                  },
                  tx
                )) as typeof guest;
              } else {
                throw e;
              }
            } else {
              throw e;
            }
          }
        } else {
          guest = (await guestRepository.updateFlat(
            (guest as { id: string }).id,
            {
              name,
              ...(plusOne !== undefined ? { plusOne } : {}),
              ...(plusOneName !== undefined ? { plusOneName: plusOneName || null } : {}),
              ...(category ? { category } : {}),
            },
            tx
          )) as typeof guest;
        }
      }

      const rsvp = await rsvpRepository.upsert(
        (guest as { id: string }).id,
        {
          attending,
          headcount: effectiveHeadcount,
          mealChoice: effectiveMealChoice as string | null,
          dietaryNotes: effectiveDietaryNotes as string | null,
          message: message || null,
        },
        tx
      );

      return { guest, rsvp };
    });

    return result;
  },
};

export type RsvpService = typeof rsvpService;
