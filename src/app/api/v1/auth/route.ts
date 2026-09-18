import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  isValidPassword,
  createSessionToken,
  verifySession,
  verifySessionWithAge,
  createStaffSession,
  ADMIN_COOKIE_NAME,
} from "@/lib/auth";
import { verifyPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const STAFF_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const loginSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(1).max(256),
});

function staffCookie(res: NextResponse, token: string): void {
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = checkRateLimit(`auth:${ip}`);
  if (!limit.allowed) {
    const retryAfterSec = Math.ceil(limit.retryAfterMs / 1000);
    return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429, headers: { "Retry-After": String(retryAfterSec) } });
  }
  try {
    let raw: unknown;
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      raw = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      raw = { email: form.get("email") ?? undefined, password: form.get("password") ?? undefined };
    } else {
      try {
        raw = await req.json();
      } catch {
        const form = await req.formData().catch(() => null);
        raw = form ? { email: form.get("email") ?? undefined, password: form.get("password") ?? undefined } : {};
      }
    }

    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const { email, password } = parsed.data;

    // Staff login: email + password against User table.
    if (email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user && (await verifyPassword(password, user.passwordHash))) {
        const token = createStaffSession(user.id, user.role);
        const res = NextResponse.json({ ok: true, role: user.role });
        staffCookie(res, token);
        return res;
      }
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Legacy compat: password-only bootstrap window until the first User exists.
    const userCount = await prisma.user.count();
    if (userCount === 0 && isValidPassword(password)) {
      const token = createSessionToken();
      const res = NextResponse.json({ ok: true, legacy: true, setupRequired: true });
      staffCookie(res, token);
      return res;
    }
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (verifySession(token) || verifySessionWithAge(token, STAFF_MAX_AGE_MS)) {
    return NextResponse.json({ authenticated: true });
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
