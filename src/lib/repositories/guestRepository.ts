import { prisma } from "@/lib/prisma";
import type { Guest, Prisma } from "@prisma/client";
import type { GuestWithRsvp } from "@/types";

/**
 * Low-level Prisma transaction client shape.
 * Using a permissive type to stay compatible with Prisma's generated
 * TransactionClient without coupling consumers to a specific version.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbClient = typeof prisma | any;

/**
 * Repository for Guest persistence.
 * Encapsulates ALL direct Prisma calls for the Guest aggregate so that
 * the service / API layer never imports `prisma` directly.
 *
 * Every method accepts an optional `client` (defaults to the global `prisma`).
 * When called inside a `$transaction`, callers can pass the transaction client
 * to reuse the same transaction context — the repository stays agnostic.
 */
/**
 * Pagination options for guest queries.
 * - page: 1-based page number (default 1)
 * - limit: page size (default 50, max 100). Use MAX_EXPORT_LIMIT guard for full export streaming.
 * - cursor: opaque cursor (guest id) for cursor-based pagination (preferred for export streaming)
 */
export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 100;
export const MAX_EXPORT_BATCH = 500;

export type PaginationOptions = {
  page?: number;
  limit?: number;
  cursor?: string;
};

function clampPagination(opts: PaginationOptions = {}): { take: number; skip: number; cursor?: string } {
  const limit = Math.min(Math.max(opts.limit ?? DEFAULT_PAGE_LIMIT, 1), MAX_PAGE_LIMIT);
  const page = Math.max(opts.page ?? 1, 1);
  const skip = (page - 1) * limit;
  return { take: limit, skip, cursor: opts.cursor };
}

export const guestRepository = {
  /**
   * Fetch all guests with their RSVP relation, newest first.
   * Used by admin dashboard, /api/guests and CSV export.
   * @deprecated Prefer findPaginatedWithRsvp or findWithCursor for large tables to avoid OOM.
   */
  findAllWithRsvp(client: DbClient = prisma): Promise<GuestWithRsvp[]> {
    return client.guest.findMany({
      include: { rsvp: true },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Paginated fetch — offset-based (page/limit) or cursor-based.
   * Returns { data, total } for pagination meta; cursor branch omits total for streaming.
   */
  async findPaginatedWithRsvp(
    opts: PaginationOptions = {},
    client: DbClient = prisma
  ): Promise<{ data: GuestWithRsvp[]; total: number }> {
    const { take, skip } = clampPagination(opts);
    const [data, total] = await Promise.all([
      client.guest.findMany({
        include: { rsvp: true },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      client.guest.count(),
    ]);
    return { data, total };
  },

  /**
   * Cursor-based batch for streaming (e.g. CSV export). Ordered by id asc for stable cursor.
   * Pass cursor = last id from previous batch.
   */
  findWithCursor(
    opts: { cursor?: string; take?: number } = {},
    client: DbClient = prisma
  ): Promise<GuestWithRsvp[]> {
    const take = Math.min(Math.max(opts.take ?? MAX_EXPORT_BATCH, 1), MAX_EXPORT_BATCH);
    const cursorOpts = opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {};
    return client.guest.findMany({
      include: { rsvp: true },
      orderBy: { id: "asc" },
      take,
      ...cursorOpts,
    });
  },

  /**
   * Total guest count (for pagination meta).
   */
  count(client: DbClient = prisma): Promise<number> {
    return client.guest.count();
  },

  /**
   * Find a guest by primary key (without RSVP include).
   */
  findById(id: string, client: DbClient = prisma): Promise<Guest | null> {
    return client.guest.findUnique({ where: { id } });
  },

  /**
   * Find a guest by primary key with RSVP included.
   */
  findByIdWithRsvp(id: string, client: DbClient = prisma): Promise<GuestWithRsvp | null> {
    return client.guest.findUnique({
      where: { id },
      include: { rsvp: true },
    });
  },

  /**
   * Find first guest matching an (already normalized) email.
   * Caller is responsible for trimming + lowercasing.
   */
  findByEmail(email: string, client: DbClient = prisma): Promise<Guest | null> {
    return client.guest.findFirst({ where: { email } });
  },

  /**
   * Create a new guest.
   */
  create(data: Prisma.GuestCreateInput, client: DbClient = prisma): Promise<Guest> {
    return client.guest.create({ data });
  },

  /**
   * Update an existing guest and return with RSVP included.
   */
  update(id: string, data: Prisma.GuestUpdateInput, client: DbClient = prisma): Promise<GuestWithRsvp> {
    return client.guest.update({
      where: { id },
      data,
      include: { rsvp: true },
    });
  },

  /**
   * Generic create used by the RSVP flow where data shape is flat.
   * Accepts the flat GuestCreate data used in seed / rsvp flow.
   */
  createFlat(
    data: { name: string; email: string | null; category: string; plusOne: boolean; plusOneName: string | null },
    client: DbClient = prisma
  ): Promise<Guest> {
    return client.guest.create({ data });
  },

  /**
   * Update with flat fields — mirrors the transaction logic.
   */
  updateFlat(
    id: string,
    data: Partial<{ name: string; email: string | null; category: string; plusOne: boolean; plusOneName: string | null }>,
    client: DbClient = prisma
  ): Promise<Guest> {
    return client.guest.update({ where: { id }, data });
  },
};

export type GuestRepository = typeof guestRepository;
