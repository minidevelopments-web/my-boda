import { parseGuestSession, parseStaffSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type GalleryViewer =
  | { kind: "guest"; householdId: string; guestId: string; name: string }
  | { kind: "staff"; role: "COUPLE" | "PLANNER" | "SYSADMIN" };

const STAFF_ROLES = ["COUPLE", "PLANNER", "SYSADMIN"] as const;
type StaffRole = (typeof STAFF_ROLES)[number];

function isStaffRole(role: string | undefined): role is StaffRole {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}

export async function resolveGalleryViewer(
  guestToken: string | undefined,
  staffToken: string | undefined
): Promise<GalleryViewer | null> {
  const guest = parseGuestSession(guestToken);
  if (guest) {
    try {
      const household = await prisma.household.findUnique({
        where: { id: guest.householdId },
        include: { guests: true },
      });
      if (household && (!household.expiresAt || household.expiresAt >= new Date())) {
        const name = household.guests.find((g) => g.id === guest.guestId)?.name ?? "Guest";
        return { kind: "guest", householdId: household.id, guestId: guest.guestId, name };
      }
    } catch {
      // Fall through to staff; a stale guest cookie must not lock staff out.
    }
  }

  const staff = parseStaffSession(staffToken);
  if (staff && isStaffRole(staff.role)) {
    return { kind: "staff", role: staff.role };
  }
  return null;
}
