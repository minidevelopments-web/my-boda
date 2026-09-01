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

    // Headcount semantics: when not attending, force to 1 (no guests expected)
    const effectiveHeadcount = attending ? headcount : 1;
    // Meal/dietary only relevant when attending
    const effectiveMealChoice = attending ? mealChoice || null : null;
    const effectiveDietaryNotes = attending ? dietaryNotes || null : null;

    const result = await prisma.$transaction(async (tx) => {
      let guest;

      if (guestId) {
        guest = await tx.guest.findUnique({ where: { id: guestId } });
        if (!guest) {
          throw new Error("Guest not found");
        }
        guest = await tx.guest.update({
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
        // Email dedup: schema has no @unique on email, so use findFirst
        const emailValue = email?.trim() ? email.trim() : null;
        if (emailValue) {
          guest = await tx.guest.findFirst({ where: { email: emailValue } });
        }
        if (!guest) {
          guest = await tx.guest.create({
            data: {
              name,
              email: emailValue,
              category: category || "family",
              plusOne: plusOne || false,
              plusOneName: plusOneName || null,
            },
          });
        } else {
          // Update name and plusOne fields if existing guest matched by email
          guest = await tx.guest.update({
            where: { id: guest.id },
            data: {
              name,
              ...(plusOne !== undefined ? { plusOne } : {}),
              ...(plusOneName !== undefined ? { plusOneName: plusOneName || null } : {}),
              ...(category ? { category } : {}),
            },
          });
        }
      }

      const rsvp = await tx.rsvpResponse.upsert({
        where: { guestId: guest.id },
        update: {
          attending,
          headcount: effectiveHeadcount,
          mealChoice: effectiveMealChoice,
          dietaryNotes: effectiveDietaryNotes,
          message: message || null,
          respondedAt: new Date(),
        },
        create: {
          guestId: guest.id,
          attending,
          headcount: effectiveHeadcount,
          mealChoice: effectiveMealChoice,
          dietaryNotes: effectiveDietaryNotes,
          message: message || null,
        },
      });

      return { guest, rsvp };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "Guest not found") {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
