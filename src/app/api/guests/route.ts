import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const guests = await prisma.guest.findMany({
      include: { rsvp: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: guests });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
