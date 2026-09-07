import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword } from "@/lib/adminPassword";
import { isValidLocale, pickLocale } from "@/lib/i18n";

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
 * - Protects `/admin` (pages) → redirects unauthenticated users to `/{lang}/admin/login`.
 * - Protects `/api/v1/guests*` (API) → returns 401 JSON.
 * - Leaves public routes untouched: `/admin/login`, `/api/v1/auth`, `/api/v1/rsvp`.
 *
 * Individual route handlers still contain `isAdminRequest` checks as
 * defense-in-depth, but this middleware is the single source of truth
 * for authorization at the request boundary.
 */
export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const segs = pathname.split("/").filter(Boolean);
  const maybeLang = segs[0];
  if (pathname === "/") {
    const cookie = req.cookies.get("locale")?.value ?? null;
    const lang = pickLocale(req.headers.get("accept-language"), cookie);
    const res = NextResponse.redirect(new URL(`/${lang}`, req.url));
    res.cookies.set("locale", lang, { path: "/", maxAge: 31536000 });
    return res;
  }
  // Top-level /api/* is locale-independent: API locale comes from the
  // Accept-Language header, not the URL. Never redirect API requests.
  if (segs[0] === "api") {
    const isGuestApi =
      pathname === "/api/v1/guests" ||
      pathname.startsWith("/api/v1/guests/");
    if (isGuestApi) {
      const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
      const valid = await verifySessionEdge(token);
      if (!valid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    return NextResponse.next();
  }
  if (maybeLang && !isValidLocale(maybeLang) && ["admin","rsvp","info","registry","_next"].includes(maybeLang)) {
    // legacy unprefixed public path → prefix with detected locale
    const cookie = req.cookies.get("locale")?.value ?? null;
    const lang = pickLocale(req.headers.get("accept-language"), cookie);
    const res = NextResponse.redirect(new URL(`/${lang}${pathname}`, req.url));
    res.cookies.set("locale", lang, { path: "/", maxAge: 31536000 });
    return res;
  }
  if (maybeLang && !isValidLocale(maybeLang)) {
    // invalid locale prefix → strip it and fall back to /en/...
    const rest = segs.slice(1).join("/");
    const res = NextResponse.redirect(
      new URL(rest ? `/en/${rest}` : "/en", req.url)
    );
    res.cookies.set("locale", "en", { path: "/", maxAge: 31536000 });
    return res;
  }
  // strip prefix for existing auth checks:
  const stripped = "/" + segs.slice(1).join("/");

  // Public admin login — always allow (even if already authenticated)
  if (stripped === "/admin/login" || stripped.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  // Admin pages: /admin and /admin/*
  const isAdminPage = stripped === "/admin" || stripped.startsWith("/admin/");
  if (isAdminPage) {
    const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const valid = await verifySessionEdge(token);
    if (!valid) {
      // Locale-prefixed login: segs[0] is a valid locale here (else early return above)
      const lang = maybeLang && isValidLocale(maybeLang) ? maybeLang : "en";
      const loginUrl = new URL(`/${lang}/admin/login`, req.url);
      // Preserve requested path for post-login redirect UX (optional)
      // loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Guest API: /api/v1/guests (and all sub-paths). Legacy unversioned
  // paths were removed in #22 and now 404.
  const isGuestApi =
    stripped === "/api/v1/guests" ||
    stripped.startsWith("/api/v1/guests/");

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
  matcher: ["/((?!_next|.*\\..*).*)"],
};
