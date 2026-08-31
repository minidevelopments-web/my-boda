import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

export async function GET() {
  try {
    const guests = await prisma.guest.findMany({
      include: { rsvp: true },
      orderBy: { createdAt: "desc" },
    });

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
