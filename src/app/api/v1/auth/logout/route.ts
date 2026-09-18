import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, GUEST_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set(GUEST_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
