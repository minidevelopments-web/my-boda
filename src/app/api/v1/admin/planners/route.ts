import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";
import { requireRole } from "@/lib/requireAdmin";

// COUPLE | SYSADMIN may create PLANNER accounts only.
// Any attempt to create a non-PLANNER role through this endpoint is 403:
// use SYSADMIN-only POST /api/v1/admin/users for other roles.
const createPlannerSchema = z.object({
  email: z.string().email().max(256),
  password: z.string().min(12).max(256),
  role: z.enum(["COUPLE", "PLANNER", "SYSADMIN"]).optional(),
});

export async function POST(req: NextRequest) {
  const guard = requireRole(req, "COUPLE", "SYSADMIN");
  if (guard) return guard;
  try {
    const body = await req.json().catch(() => null);
    const parsed = createPlannerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    if (parsed.data.role !== undefined && parsed.data.role !== "PLANNER") {
      return NextResponse.json({ error: "This endpoint creates PLANNER accounts only" }, { status: 403 });
    }
    const { email, password } = parsed.data;
    const user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword(password), role: "PLANNER" },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
