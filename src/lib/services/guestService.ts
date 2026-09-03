import {
  guestRepository,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  type PaginationOptions,
} from "@/lib/repositories/guestRepository";
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
   * @deprecated For large tables use getPaginatedGuests or streamGuestsForExport to avoid OOM.
   */
  getAllGuests(): Promise<GuestWithRsvp[]> {
    return guestRepository.findAllWithRsvp();
  },

  /**
   * Paginated retrieval — prevents OOM at scale.
   * Accepts page (1-based) and limit (capped to MAX_PAGE_LIMIT). Returns data + meta.
   */
  async getPaginatedGuests(opts: PaginationOptions = {}): Promise<{
    data: GuestWithRsvp[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = Math.max(opts.page ?? 1, 1);
    const limit = Math.min(Math.max(opts.limit ?? DEFAULT_PAGE_LIMIT, 1), MAX_PAGE_LIMIT);
    const { data, total } = await guestRepository.findPaginatedWithRsvp({ page, limit });
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  },

  /**
   * Cursor-based batched iterator for CSV export streaming.
   * Yields batches without loading entire table into memory.
   */
  async *streamGuestsForExport(batchSize = 500): AsyncGenerator<GuestWithRsvp[], void, unknown> {
    let cursor: string | undefined;
    while (true) {
      const batch = await guestRepository.findWithCursor({ cursor, take: batchSize });
      if (batch.length === 0) break;
      yield batch;
      if (batch.length < batchSize) break;
      cursor = batch[batch.length - 1].id;
    }
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
   * @deprecated Prefer streamGuestsForExport for large datasets to avoid OOM.
   */
  async getGuestsForExport() {
    return guestRepository.findAllWithRsvp();
  },
};

export type GuestService = typeof guestService;
