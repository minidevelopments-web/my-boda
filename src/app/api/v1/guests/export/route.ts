import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { requireAdmin } from "@/lib/requireAdmin";
import { guestService } from "@/lib/services/guestService";

export async function GET(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard) return guard;
  try {
    const guests = await guestService.getAllGuests();

    const rows = guests.map((g) => ({
      id: g.id,
      name: g.name,
      email: g.email || "",
      category: g.category,
      plusOne: g.plusOne ? "yes" : "no",
      plusOneName: g.plusOneName || "",
      attending: g.rsvp?.attending ? "yes" : g.rsvp ? "no" : "",
      headcount: g.rsvp?.headcount ?? "",
      mealChoice: g.rsvp?.mealChoice || "",
      dietaryNotes: g.rsvp?.dietaryNotes || "",
      message: g.rsvp?.message || "",
      respondedAt: g.rsvp?.respondedAt?.toISOString() || "",
      createdAt: g.createdAt.toISOString(),
    }));

    const csv = Papa.unparse(rows);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="guests.csv"',
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
