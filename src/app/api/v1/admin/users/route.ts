import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";
import { requireRole } from "@/lib/requireAdmin";

const createUserSchema = z.object({
  email: z.string().email().max(256),
  password: z.string().min(12).max(256),
  role: z.enum(["COUPLE", "PLANNER", "SYSADMIN"]),
});

export async function GET(req: NextRequest) {
  const guard = requireRole(req, "SYSADMIN");
  if (guard) return guard;
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ data: users });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = requireRole(req, "SYSADMIN");
  if (guard) return guard;
  try {
    const body = await req.json().catch(() => null);
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { email, password, role } = parsed.data;
    const user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword(password), role },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
