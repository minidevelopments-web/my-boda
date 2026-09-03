import { prisma } from "@/lib/prisma";
import type { RsvpResponse } from "@prisma/client";
import type { DbClient } from "./guestRepository";

/**
 * Repository for RsvpResponse persistence.
 * Mirrors guestRepository's client-injection pattern for transaction reuse.
 */
export const rsvpRepository = {
  /**
   * Upsert RSVP for a given guestId.
   * `payload` should already be normalized (effectiveHeadcount, etc.).
   */
  upsert(
    guestId: string,
    payload: {
      attending: boolean;
      headcount: number;
      mealChoice: string | null;
      dietaryNotes: string | null;
      message: string | null;
    },
    client: DbClient = prisma
  ): Promise<RsvpResponse> {
    return client.rsvpResponse.upsert({
      where: { guestId },
      update: {
        attending: payload.attending,
        headcount: payload.headcount,
        mealChoice: payload.mealChoice,
        dietaryNotes: payload.dietaryNotes,
        message: payload.message,
        respondedAt: new Date(),
      },
      create: {
        guestId,
        attending: payload.attending,
        headcount: payload.headcount,
        mealChoice: payload.mealChoice,
        dietaryNotes: payload.dietaryNotes,
        message: payload.message,
      },
    });
  },

  findByGuestId(guestId: string, client: DbClient = prisma): Promise<RsvpResponse | null> {
    return client.rsvpResponse.findUnique({ where: { guestId } });
  },
};

export type RsvpRepository = typeof rsvpRepository;
