import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guestUpdateSchema } from "@/lib/validators";
import { isAdminRequest } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = guestUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const guest = await prisma.guest.findUnique({ where: { id } });
    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }
    const updated = await prisma.guest.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.email !== undefined ? { email: parsed.data.email || null } : {}),
        ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
        ...(parsed.data.plusOne !== undefined ? { plusOne: parsed.data.plusOne } : {}),
        ...(parsed.data.plusOneName !== undefined ? { plusOneName: parsed.data.plusOneName || null } : {}),
      },
      include: { rsvp: true },
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
