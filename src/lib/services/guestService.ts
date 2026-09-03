import { guestRepository } from "@/lib/repositories/guestRepository";
import type { GuestWithRsvp } from "@/types";
import type { GuestUpdateInput } from "@/lib/validators";

/**
 * GuestService — business-logic / orchestration layer for Guest.
 * All callers (API routes, Server Components) should import this service
 * instead of `prisma` directly. Swapping the data layer only requires
 * updating the underlying `guestRepository`.
 */

function normalizeEmail(email: unknown): string | null | undefined {
  if (email === undefined) return undefined;
  if (email === null || email === "") return null;
  const trimmed = String(email).trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

export const guestService = {
  /**
   * Retrieve all guests with RSVP, ordered newest first.
   */
  getAllGuests(): Promise<GuestWithRsvp[]> {
    return guestRepository.findAllWithRsvp();
  },

  /**
   * Find a guest by id (with RSVP).
   */
  getGuestById(id: string) {
    return guestRepository.findByIdWithRsvp(id);
  },

  /**
   * Update an existing guest. Handles email normalization.
   * Throws with message "Guest not found" if id is unknown (to keep
   * API semantics identical to the previous direct-Prisma code).
   */
  async updateGuest(id: string, input: GuestUpdateInput): Promise<GuestWithRsvp> {
    const existing = await guestRepository.findById(id);
    if (!existing) {
      throw new Error("Guest not found");
    }

    const normalizedEmail = normalizeEmail(input.email);

    return guestRepository.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.plusOne !== undefined ? { plusOne: input.plusOne } : {}),
      ...(input.plusOneName !== undefined ? { plusOneName: input.plusOneName || null } : {}),
    });
  },

  /**
   * Data shaper for CSV export — returns the same rows the previous
   * export route mapped inline, but centralized for reuse.
   */
  async getGuestsForExport() {
    return guestRepository.findAllWithRsvp();
  },
};

export type GuestService = typeof guestService;
