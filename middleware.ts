import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword } from "@/lib/adminPassword";
import { isValidLocale, pickLocale } from "@/lib/i18n";

export const ADMIN_COOKIE_NAME = "admin_session";

/**
 * Edge-compatible session verification.
 * - Payload formats (all HMAC-SHA256-signed, sig appended as `${payload}.${sig}`):
 *   legacy staff `${timestamp}.${randomHex}`, role staff
 *   `${userId}.${role}.${timestamp}.${randomHex}`, guest
 *   `g.${householdId}.${guestId}.${timestamp}.${randomHex}`
 * - Expiry: 7 days staff window, future skew tolerance 60s. The timestamp is
 *   always the second-to-last payload segment, so verification stays
 *   payload-shape agnostic (guest 30-day sessions are re-checked with their
 *   own window inside handlers via `parseGuestSession`).
 *
 * Uses Web Crypto (`crypto.subtle`) — available in both Edge runtime and
 * modern Node (18+) / Jest. No `node:crypto` import, no bcrypt, no Prisma,
 * to stay Edge-compatible.
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

  // ---- expiry check (payload-shape agnostic: ts is 2nd-to-last segment) ----
  const ts = Number(payload.split(".").slice(-2, -1)[0]);
  if (!Number.isFinite(ts)) return false;
  const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - ts > SESSION_MAX_AGE_MS) return false;
  if (ts > Date.now() + 60 * 1000) return false;

  return true;
}

/**
 * Edge mirror of `parseStaffSession` role parsing (string ops only — no
 * `node:crypto`, bcrypt, or Prisma, so it stays Edge-compatible).
 * - staff: `userId.role.ts.rand` → role
 * - guest: `g.household.guest.ts.rand` → "GUEST"
 * - legacy: `ts.rand` → null (pre-role token → caller forces re-login)
 * Call only with a token that already passed `verifySessionEdge`.
 */
export function parseRoleEdge(token: string): string | null {
  const payload = token.slice(0, token.lastIndexOf("."));
  const parts = payload.split(".");
  if (parts[0] === "g") return "GUEST";
  if (parts.length >= 4 && ["COUPLE", "PLANNER", "SYSADMIN"].includes(parts[1])) return parts[1];
  return null;
}

const STAFF_ROLES = ["COUPLE", "PLANNER", "SYSADMIN"];

function isSysadminApi(path: string): boolean {
  return path === "/api/v1/admin/users" || path.startsWith("/api/v1/admin/users/");
}

function isPlannersApi(path: string): boolean {
  return path === "/api/v1/admin/planners" || path.startsWith("/api/v1/admin/planners/");
}

function isGuestApiPath(path: string): boolean {
  return path === "/api/v1/guests" || path.startsWith("/api/v1/guests/");
}

function isAlwaysAllowApi(path: string): boolean {
  return (
    path === "/api/v1/guest/verify" ||
    path.startsWith("/api/v1/guest/verify/") ||
    path === "/api/v1/rsvp" ||
    path.startsWith("/api/v1/rsvp/") ||
    path === "/api/v1/auth" ||
    path.startsWith("/api/v1/auth/")
  );
}

/**
 * Staff API gate. Returns true when allowed. Unlisted paths default to allow
 * (handlers re-check via `requireRole` defense-in-depth; e.g. bootstrap-once
 * `/api/v1/admin/setup` must stay reachable without a session).
 */
function authorizeStaffApi(path: string, method: string, valid: boolean, role: string | null): boolean {
  if (isAlwaysAllowApi(path)) return true;
  if (isSysadminApi(path)) return valid && role === "SYSADMIN";
  if (isPlannersApi(path)) {
    // Spec-governs: couple creates planners only.
    if (method.toUpperCase() === "POST") return valid && (role === "COUPLE" || role === "SYSADMIN");
    return valid && role !== null && STAFF_ROLES.includes(role);
  }
  if (isGuestApiPath(path)) return valid && role !== null && STAFF_ROLES.includes(role);
  return true;
}

function staffLoginRedirect(req: NextRequest, lang: string): NextResponse {
  const url = new URL(`/${lang}/login`, req.url);
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url, 307);
}

async function staffRoleOf(req: NextRequest): Promise<{ valid: boolean; role: string | null }> {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const valid = await verifySessionEdge(token);
  if (!valid || !token) return { valid, role: null };
  return { valid, role: parseRoleEdge(token) };
}
/**
 * Centralized authentication middleware.
 *
 * - Protects `/admin` (pages) → redirects unauthenticated users to `/{lang}/login?next=...`.
 * - `/admin/system` pages + `/api/v1/admin/users*` → SYSADMIN only.
 * - `POST /api/v1/admin/planners` → COUPLE|SYSADMIN.
 * - Protects `/api/v1/guests*` (API) → returns 401 JSON.
 * - Leaves public routes untouched: `/setup`, `/login`, `/admin/login`,
 *   `/api/v1/auth`, `/api/v1/rsvp`, `/api/v1/guest/verify`.
 * - Legacy pre-role tokens are valid-signed but role-less → redirect to login
 *   (forces re-login post-upgrade).
 *
 * Individual route handlers still contain `isAdminRequest`/`requireRole`
 * checks as defense-in-depth, but this middleware is the single source of
 * truth for authorization at the request boundary.
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
    const { valid, role } = await staffRoleOf(req);
    if (!authorizeStaffApi(pathname, req.method, valid, role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  // Locale-prefixed paths: segs[0] is a valid locale here (else early return above)
  const lang = maybeLang && isValidLocale(maybeLang) ? maybeLang : "en";

  // Always-allow pages: /setup (page itself gates on User.count), /login,
  // and the legacy /admin/login path (kept as a re-export in Task 5).
  if (
    stripped === "/setup" || stripped.startsWith("/setup/") ||
    stripped === "/login" || stripped.startsWith("/login/") ||
    stripped === "/admin/login" || stripped.startsWith("/admin/login/")
  ) {
    return NextResponse.next();
  }

  // Locale-prefixed API paths (e.g. /en/api/v1/guests): never redirect,
  // deny with 401 JSON per the staff API matrix.
  if (stripped === "/api/v1" || stripped.startsWith("/api/v1/")) {
    const { valid, role } = await staffRoleOf(req);
    if (!authorizeStaffApi(stripped, req.method, valid, role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // SYSADMIN-only page: /admin/system.
  if (stripped === "/admin/system" || stripped.startsWith("/admin/system/")) {
    const { valid, role } = await staffRoleOf(req);
    if (!valid || role !== "SYSADMIN") {
      return staffLoginRedirect(req, lang);
    }
    return NextResponse.next();
  }

  // Admin pages: /admin and /admin/* → COUPLE|PLANNER|SYSADMIN.
  // Legacy role-less (but valid-signed) tokens fall through to the login
  // redirect, forcing a re-login post-upgrade.
  const isAdminPage = stripped === "/admin" || stripped.startsWith("/admin/");
  if (isAdminPage) {
    const { valid, role } = await staffRoleOf(req);
    if (!valid || !role || !STAFF_ROLES.includes(role)) {
      return staffLoginRedirect(req, lang);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
