/**
 * Core authentication utilities (Node runtime).
 *
 * This module is the canonical implementation for session signing/verification
 * on the server (API routes, Server Components). The Edge-compatible mirror
 * lives in `middleware.ts:verifySessionEdge` — keep the HMAC payload format,
 * expiry window, and secret derivation in sync between the two.
 *
 * Centralized flow: `middleware.ts` is the single source of truth at the
 * request boundary (see `src/lib/requireAdmin.ts` for the per-handler helper).
 * Per-route `isAdminRequest` checks remain as defense-in-depth.
 */
import crypto from "crypto";
import { NextRequest } from "next/server";
import { getAdminPassword } from "./adminPassword";

export { getAdminPassword };

export const ADMIN_COOKIE_NAME = "admin_session";
export const GUEST_COOKIE_NAME = "guest_session";

const STAFF_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const GUEST_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function getAuthSecret(): string {
  const pw = getAdminPassword();
  if (!pw) return "";
  return pw;
}

export function isValidPassword(candidate: string): boolean {
  const expected = getAdminPassword();
  if (!expected) return false;
  // hash to fixed length then constant-time compare to avoid length leak
  const aHash = crypto.createHash("sha256").update(candidate).digest();
  const bHash = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(aHash, bHash);
}

export function signSession(payload: string): string {
  const secret = getAuthSecret();
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined | null): boolean {
  if (!token) return false;
  const secret = getAuthSecret();
  if (!secret) return false;
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return false;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (sig.length !== expectedSig.length) return false;
  let sigValid: boolean;
  try {
    sigValid = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  } catch {
    sigValid = sig === expectedSig;
  }
  if (!sigValid) return false;
  // expiry check: payload is `${timestamp}.${randomHex}`
  const dotIdx = payload.indexOf(".");
  if (dotIdx === -1) return false;
  const ts = Number(payload.slice(0, dotIdx));
  if (!Number.isFinite(ts)) return false;
  const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - ts > SESSION_MAX_AGE_MS) return false;
  if (ts > Date.now() + 60 * 1000) return false;
  return true;
}

export function createSessionToken(): string {
  const payload = `${Date.now()}.${crypto.randomBytes(16).toString("hex")}`;
  return signSession(payload);
}

export function isAdminRequest(req: NextRequest): boolean {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (verifySession(token)) return true;
  // Accept role-bearing staff sessions (userId.role.ts.rand) whose
  // timestamp is not the first payload segment — see parseStaffSession.
  return verifySessionWithAge(token, STAFF_MAX_AGE_MS);
}

export const isAdmin = isAdminRequest;

// For server components using next/headers cookies()
export function isAdminFromToken(token: string | undefined | null): boolean {
  return verifySession(token);
}

export function createStaffSession(userId: string, role: string): string {
  const payload = `${userId}.${role}.${Date.now()}.${crypto.randomBytes(8).toString("hex")}`;
  return signSession(payload);
}

export function parseStaffSession(token: string | null | undefined): { userId: string; role?: string } | null {
  if (!verifySessionWithAge(token, STAFF_MAX_AGE_MS)) return null;
  const payload = token!.slice(0, token!.lastIndexOf("."));
  const [userId, role] = payload.split(".");
  if (!userId) return null;
  return role && ["COUPLE", "PLANNER", "SYSADMIN"].includes(role) ? { userId, role } : { userId };
}

export function createGuestSession(householdId: string, guestId: string): string {
  const payload = `g.${householdId}.${guestId}.${Date.now()}.${crypto.randomBytes(8).toString("hex")}`;
  return signSession(payload);
}

export function parseGuestSession(token: string | null | undefined): { householdId: string; guestId: string } | null {
  if (!verifySessionWithAge(token, GUEST_MAX_AGE_MS)) return null;
  const payload = token!.slice(0, token!.lastIndexOf("."));
  const parts = payload.split(".");
  if (parts[0] !== "g" || !parts[1] || !parts[2]) return null;
  return { householdId: parts[1], guestId: parts[2] };
}

export function verifySessionWithAge(token: string | null | undefined, maxAge: number): boolean {
  if (!token) return false;
  const secret = getAuthSecret();
  if (!secret) return false;
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return false;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (sig.length !== expected.length) return false;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  } catch {
    return false;
  }
  const ts = Number(payload.split(".").slice(-2, -1)[0]);
  if (!Number.isFinite(ts)) return false;
  if (Date.now() - ts > maxAge) return false;
  if (ts > Date.now() + 60 * 1000) return false;
  return true;
}
