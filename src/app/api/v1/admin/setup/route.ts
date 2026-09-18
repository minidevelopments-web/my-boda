import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";

const setupSchema = z.object({
  sysadminEmail: z.string().email().max(256),
  sysadminPassword: z.string().min(12).max(256),
  coupleEmail: z.string().email().max(256),
  couplePassword: z.string().min(12).max(256),
});

export async function GET() {
  try {
    const count = await prisma.user.count();
    return NextResponse.json({ needsSetup: count === 0 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Bootstrap-once: forbidden as soon as any User exists.
    const count = await prisma.user.count();
    if (count !== 0) {
      return NextResponse.json({ error: "Setup already completed" }, { status: 403 });
    }
    const body = await req.json().catch(() => null);
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { sysadminEmail, sysadminPassword, coupleEmail, couplePassword } = parsed.data;
    try {
      const sysadmin = await prisma.user.create({
        data: { email: sysadminEmail, passwordHash: await hashPassword(sysadminPassword), role: "SYSADMIN" },
        select: { id: true, email: true, role: true, createdAt: true },
      });
      const couple = await prisma.user.create({
        data: { email: coupleEmail, passwordHash: await hashPassword(couplePassword), role: "COUPLE" },
        select: { id: true, email: true, role: true, createdAt: true },
      });
      return NextResponse.json({ data: { sysadmin, couple } }, { status: 201 });
    } catch (e) {
      if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
        return NextResponse.json({ error: "Setup already completed" }, { status: 409 });
      }
      throw e;
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
