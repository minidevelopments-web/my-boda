import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeInviteCode } from "@/lib/inviteCodes";
import { createGuestSession, GUEST_COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const verifySchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(256),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  try {
    const body = await req.json().catch(() => null);
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid code or name" }, { status: 400 });
    }
    const code = normalizeInviteCode(parsed.data.code);
    const name = parsed.data.name.trim().toLowerCase();
    if (!code || !name) {
      return NextResponse.json({ error: "Invalid code or name" }, { status: 400 });
    }

    const limit = checkRateLimit(`guest:${ip}`);
    if (!limit.allowed) {
      const retryAfterSec = Math.ceil(limit.retryAfterMs / 1000);
      return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429, headers: { "Retry-After": String(retryAfterSec) } });
    }

    const household = await prisma.household.findUnique({
      where: { inviteCode: code },
      include: { guests: true },
    });
    const match = household?.guests.find((g) =>
      g.name.toLowerCase().includes(name) ||
        (g.plusOneName ?? "").toLowerCase().includes(name)
    );
    if (!household || !match || (household.expiresAt && household.expiresAt < new Date())) {
      checkRateLimit(`guest:${ip}`);
      return NextResponse.json({ error: "Invalid code or name" }, { status: 401 });
    }

    const token = createGuestSession(household.id, match.id);
    const res = NextResponse.json({ ok: true, householdId: household.id });
    res.cookies.set(GUEST_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
