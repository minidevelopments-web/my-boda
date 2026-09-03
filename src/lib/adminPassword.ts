/**
 * Single source of truth for admin password derivation.
 * Edge-compatible: no `node:crypto` import, only env access.
 * Used by both `middleware.ts` (Edge) and `src/lib/auth.ts` (Node).
 */

export function getAdminPassword(): string {
  const env = process.env.ADMIN_PASSWORD;
  if (env) return env;
  if (process.env.NODE_ENV === "production") return "";
  return "admin123";
}
