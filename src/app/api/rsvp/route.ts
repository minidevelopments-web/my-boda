import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rsvpSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = rsvpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { name, email, attending, headcount, mealChoice, dietaryNotes, message, guestId, category, plusOne, plusOneName } = parsed.data;

    let guest;
    if (guestId) {
      guest = await prisma.guest.findUnique({ where: { id: guestId } });
      if (!guest) {
        return NextResponse.json({ error: "Guest not found" }, { status: 404 });
      }
      // Update guest name/category if provided
      guest = await prisma.guest.update({
        where: { id: guestId },
        data: {
          ...(name ? { name } : {}),
          ...(email !== undefined ? { email: email || null } : {}),
          ...(category ? { category } : {}),
          ...(plusOne !== undefined ? { plusOne } : {}),
          ...(plusOneName !== undefined ? { plusOneName: plusOneName || null } : {}),
        },
      });
    } else {
      // Try to find by email or create new guest
      if (email) {
        guest = await prisma.guest.findFirst({ where: { email } });
      }
      if (!guest) {
        guest = await prisma.guest.create({
          data: {
            name,
            email: email || null,
            category: category || "family",
            plusOne: plusOne || false,
            plusOneName: plusOneName || null,
          },
        });
      } else {
        guest = await prisma.guest.update({
          where: { id: guest.id },
          data: { name },
        });
      }
    }

    const rsvp = await prisma.rsvpResponse.upsert({
      where: { guestId: guest.id },
      update: {
        attending,
        headcount,
        mealChoice: mealChoice || null,
        dietaryNotes: dietaryNotes || null,
        message: message || null,
        respondedAt: new Date(),
      },
      create: {
        guestId: guest.id,
        attending,
        headcount,
        mealChoice: mealChoice || null,
        dietaryNotes: dietaryNotes || null,
        message: message || null,
      },
    });

    return NextResponse.json({ data: { guest, rsvp } }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
