import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { guestService } from "@/lib/services/guestService";

function parsePagination(req: NextRequest): { page?: number; limit?: number } | null | undefined {
  const { searchParams } = new URL(req.url);
  const rawPage = searchParams.get("page");
  const rawLimit = searchParams.get("limit");
  const cursor = searchParams.get("cursor");
  // If any pagination param is present, validate and enforce.
  if (rawPage !== null || rawLimit !== null || cursor !== null) {
    const page = rawPage !== null ? Number(rawPage) : 1;
    const limit = rawLimit !== null ? Number(rawLimit) : undefined;
    if (rawPage !== null && (!Number.isInteger(page) || page < 1)) return null;
    if (rawLimit !== null && (!Number.isInteger(limit!) || limit! < 1)) return null;
    return { page, limit };
  }
  return undefined; // no pagination requested → backward-compatible full fetch
}

export async function GET(req: NextRequest) {
  // Primary auth is enforced by middleware.ts (edge, single source of truth).
  // This per-handler guard is defense-in-depth and keeps unit tests honest
  // when handlers are invoked directly without middleware.
  const guard = requireAdmin(req);
  if (guard) return guard;
  try {
    const pagination = parsePagination(req);
    if (pagination === null) {
      return NextResponse.json({ error: "Invalid pagination params: page and limit must be positive integers" }, { status: 400 });
    }
    // If client explicitly requested pagination (query present), return paginated shape.
    // Otherwise keep backward-compatible unpaginated response for existing clients/tests.
    if (pagination !== undefined) {
      const result = await guestService.getPaginatedGuests(pagination);
      return NextResponse.json({ data: result.data, meta: result.meta });
    }
    const guests = await guestService.getAllGuests();
    return NextResponse.json({ data: guests });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
