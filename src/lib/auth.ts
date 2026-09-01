import crypto from "crypto";
import { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "admin_session";

export function getAdminPassword(): string {
  const env = process.env.ADMIN_PASSWORD;
  if (env) return env;
  if (process.env.NODE_ENV === "production") return "";
  return "admin123";
}

export function getAuthSecret(): string {
  // HMAC secret: use ADMIN_PASSWORD or fallback for dev
  const pw = getAdminPassword();
  return pw || "dev-fallback-secret";
}

export function isValidPassword(candidate: string): boolean {
  const expected = getAdminPassword();
  if (!expected) return false;
  // constant-time compare if lengths match
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return candidate === expected;
  }
}

export function signSession(payload: string): string {
  const secret = getAuthSecret();
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined | null): boolean {
  if (!token) return false;
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return false;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const secret = getAuthSecret();
  const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (sig.length !== expectedSig.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  } catch {
    return sig === expectedSig;
  }
}

export function createSessionToken(): string {
  const payload = `${Date.now()}.${crypto.randomBytes(16).toString("hex")}`;
  return signSession(payload);
}

export function isAdminRequest(req: NextRequest): boolean {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return verifySession(token);
}

// For server components using next/headers cookies()
export function isAdminFromToken(token: string | undefined | null): boolean {
  return verifySession(token);
}
