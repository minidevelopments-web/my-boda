import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword } from "@/lib/adminPassword";

export const ADMIN_COOKIE_NAME = "admin_session";

/**
 * Edge-compatible session verification.
 * - Payload format: `${timestamp}.${randomHex}`
 * - Signature: HMAC-SHA256(payload, secret) hex-encoded, appended as `${payload}.${sig}`
 * - Expiry: 7 days, future skew tolerance 60s
 *
 * Uses Web Crypto (`crypto.subtle`) — available in both Edge runtime and
 * modern Node (18+) / Jest. No `node:crypto` import, to stay Edge-compatible.
 */
export async function verifySessionEdge(
  token: string | null | undefined
): Promise<boolean> {
  if (!token) return false;
  const secret = getAdminPassword();
  if (!secret) return false;

  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return false;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);

  // ---- compute expected HMAC via Web Crypto ----
  let expectedSig: string;
  const encoder = new TextEncoder();

  try {
    const key = await globalThis.crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBuf = await globalThis.crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    expectedSig = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return false;
  }

  if (sig.length !== expectedSig.length) return false;

  // constant-time compare to avoid timing leak
  let diff = 0;
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  if (diff !== 0) return false;

  // ---- expiry check ----
  const dotIdx = payload.indexOf(".");
  if (dotIdx === -1) return false;
  const ts = Number(payload.slice(0, dotIdx));
  if (!Number.isFinite(ts)) return false;
  const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - ts > SESSION_MAX_AGE_MS) return false;
  if (ts > Date.now() + 60 * 1000) return false;

  return true;
}

/**
 * Centralized authentication middleware.
 *
 * - Protects `/admin` (pages) → redirects unauthenticated users to `/admin/login`.
 * - Protects `/api/v1/guests*` and `/api/guests*` (API) → returns 401 JSON.
 * - Leaves public routes untouched: `/admin/login`, `/api/v1/auth`, `/api/auth`, `/api/v1/rsvp`, `/api/rsvp`.
 *
 * Individual route handlers still contain `isAdminRequest` checks as
 * defense-in-depth, but this middleware is the single source of truth
 * for authorization at the request boundary.
 */
export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Public admin login — always allow (even if already authenticated)
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  // Admin pages: /admin and /admin/*
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isAdminPage) {
    const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const valid = await verifySessionEdge(token);
    if (!valid) {
      const loginUrl = new URL("/admin/login", req.url);
      // Preserve requested path for post-login redirect UX (optional)
      // loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Guest APIs: /api/v1/guests and /api/guests (and all sub-paths)
  const isGuestApi =
    pathname === "/api/v1/guests" ||
    pathname.startsWith("/api/v1/guests/") ||
    pathname === "/api/guests" ||
    pathname.startsWith("/api/guests/");

  if (isGuestApi) {
    const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const valid = await verifySessionEdge(token);
    if (!valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/v1/guests/:path*",
    "/api/guests/:path*",
  ],
};
