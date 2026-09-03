import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";

/**
 * Centralized admin guard for API routes.
 *
 * This is the programmatic counterpart to `middleware.ts`.
 * The middleware enforces authorization at the edge/request boundary
 * for `/api/v1/guests*` and `/api/guests*`. This helper provides
 * the same check for:
 *   - defense-in-depth inside route handlers,
 *   - unit tests that invoke handlers directly (bypassing middleware),
 *   - any future protected routes not yet covered by the matcher.
 *
 * Usage:
 * ```ts
 * export async function GET(req: NextRequest) {
 *   const guard = requireAdmin(req);
 *   if (guard) return guard;
 *   // ... authorized logic
 * }
 * ```
 *
 * Returns `null` when authorized, otherwise a 401 JSON response.
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Higher-order wrapper for API route handlers that need admin protection.
 *
 * Example:
 * ```ts
 * export const GET = withAdminAuth(async (req) => {
 *   const guests = await guestService.getAllGuests();
 *   return NextResponse.json({ data: guests });
 * });
 * ```
 */
export function withAdminAuth<T extends unknown[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const guard = requireAdmin(req);
    if (guard) return guard;
    return handler(req, ...args);
  };
}
