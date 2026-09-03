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
export const guestRepository = {
  /**
   * Fetch all guests with their RSVP relation, newest first.
   * Used by admin dashboard, /api/guests and CSV export.
   */
  findAllWithRsvp(client: DbClient = prisma): Promise<GuestWithRsvp[]> {
    return client.guest.findMany({
      include: { rsvp: true },
      orderBy: { createdAt: "desc" },
    });
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
