import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, GUEST_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const clearAttrs = {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
  res.cookies.set(ADMIN_COOKIE_NAME, "", clearAttrs);
  res.cookies.set(GUEST_COOKIE_NAME, "", clearAttrs);
  return res;
}
