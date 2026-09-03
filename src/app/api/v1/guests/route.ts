import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { guestService } from "@/lib/services/guestService";

export async function GET(req: NextRequest) {
  // Primary auth is enforced by middleware.ts (edge, single source of truth).
  // This per-handler guard is defense-in-depth and keeps unit tests honest
  // when handlers are invoked directly without middleware.
  const guard = requireAdmin(req);
  if (guard) return guard;
  try {
    const guests = await guestService.getAllGuests();
    return NextResponse.json({ data: guests });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
