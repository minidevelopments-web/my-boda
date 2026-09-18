import { NextRequest, NextResponse } from "next/server";
import { guestUpdateSchema } from "@/lib/validators";
import { requireRole } from "@/lib/requireAdmin";
import { guestService } from "@/lib/services/guestService";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = requireRole(req, "COUPLE", "PLANNER", "SYSADMIN");
  if (guard) return guard;
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = guestUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    try {
      const updated = await guestService.updateGuest(id, parsed.data);
      return NextResponse.json({ data: updated });
    } catch (e) {
      if (e instanceof Error && e.message === "Guest not found") {
        return NextResponse.json({ error: "Guest not found" }, { status: 404 });
      }
      throw e;
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
