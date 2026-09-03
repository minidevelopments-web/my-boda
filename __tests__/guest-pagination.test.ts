/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

// Mocks for prisma layer
const mockFindMany = jest.fn();
const mockCount = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    guest: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    rsvpResponse: { upsert: jest.fn() },
    $transaction: jest.fn(),
  },
}));

// Ensure auth guard passes in tests — set env and mock requireAdmin to bypass
jest.mock("@/lib/requireAdmin", () => ({
  requireAdmin: () => null,
}));

describe("guestRepository pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
  });

  it("clamps limit to MAX_PAGE_LIMIT (100)", async () => {
    const { guestRepository, MAX_PAGE_LIMIT } = await import("@/lib/repositories/guestRepository");
    mockFindMany.mockResolvedValue([{ id: "1" } as any]);
    mockCount.mockResolvedValue(150);

    const result = await guestRepository.findPaginatedWithRsvp({ page: 1, limit: 999 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: MAX_PAGE_LIMIT, skip: 0 })
    );
    expect(result.total).toBe(150);
    expect(result.data).toHaveLength(1);
  });

  it("clamps page to >=1 and limit to >=1", async () => {
    const { guestRepository } = await import("@/lib/repositories/guestRepository");
    await guestRepository.findPaginatedWithRsvp({ page: -5, limit: 0 });
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 1 }));
  });

  it("findWithCursor caps take at MAX_EXPORT_BATCH (500)", async () => {
    const { guestRepository, MAX_EXPORT_BATCH } = await import("@/lib/repositories/guestRepository");
    mockFindMany.mockResolvedValue([]);
    await guestRepository.findWithCursor({ take: 9999 });
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: MAX_EXPORT_BATCH }));
  });

  it("findWithCursor uses cursor + skip 1 when cursor provided", async () => {
    const { guestRepository } = await import("@/lib/repositories/guestRepository");
    mockFindMany.mockResolvedValue([]);
    await guestRepository.findWithCursor({ cursor: "abc", take: 10 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { id: "abc" }, skip: 1, take: 10 })
    );
  });
});

describe("guestService pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
  });

  it("getPaginatedGuests returns meta with totalPages", async () => {
    const { guestService } = await import("@/lib/services/guestService");
    // Mock 95 total, page 1 limit 50 -> 2 pages
    mockFindMany.mockResolvedValue(Array.from({ length: 50 }, (_, i) => ({ id: `${i}` })) as any);
    mockCount.mockResolvedValue(95);

    const result = await guestService.getPaginatedGuests({ page: 1, limit: 50 });
    expect(result.meta).toEqual({ page: 1, limit: 50, total: 95, totalPages: 2 });
    expect(result.data).toHaveLength(50);
  });

  it("streamGuestsForExport yields batches without loading all", async () => {
    const { guestService } = await import("@/lib/services/guestService");
    // Simulate 2 batches: first full (500), second partial
    const batch1 = Array.from({ length: 2 }, (_, i) => ({ id: `id${i}` })) as any;
    const batch2 = [{ id: "id2" } as any];
    let call = 0;
    mockFindMany.mockImplementation(async () => {
      call++;
      if (call === 1) return batch1;
      if (call === 2) return batch2;
      return [];
    });

    const batches: any[][] = [];
    for await (const batch of guestService.streamGuestsForExport(2)) {
      batches.push(batch);
    }
    expect(batches).toHaveLength(2);
    expect(batches[0]).toEqual(batch1);
    expect(batches[1]).toEqual(batch2);
  });
});

describe("GET /api/v1/guests pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindMany.mockResolvedValue([{ id: "1", name: "Alice", rsvp: null, createdAt: new Date() } as any]);
    mockCount.mockResolvedValue(1);
  });

  it("returns paginated shape when ?page&limit present", async () => {
    const { GET } = await import("@/app/api/v1/guests/route");
    const req = new NextRequest("http://localhost/api/v1/guests?page=1&limit=10");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meta).toBeDefined();
    expect(json.meta.page).toBe(1);
    expect(json.meta.limit).toBe(10);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it("returns 400 on invalid pagination params", async () => {
    const { GET } = await import("@/app/api/v1/guests/route");
    const req = new NextRequest("http://localhost/api/v1/guests?page=0&limit=10");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid pagination/);
  });

  it("returns 400 on non-integer limit", async () => {
    const { GET } = await import("@/app/api/v1/guests/route");
    const req = new NextRequest("http://localhost/api/v1/guests?limit=abc");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("caps limit to 100 via service layer", async () => {
    const { GET } = await import("@/app/api/v1/guests/route");
    const req = new NextRequest("http://localhost/api/v1/guests?page=1&limit=999");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meta.limit).toBe(100);
  });

  it("backward compatible: no query returns plain data array without meta", async () => {
    mockFindMany.mockResolvedValue([{ id: "1" } as any]);
    // Need to mock findAllWithRsvp path (findMany without pagination uses findAllWithRsvp)
    // Our route falls back to getAllGuests which calls findAllWithRsvp -> findMany without take/skip
    const { GET } = await import("@/app/api/v1/guests/route");
    const req = new NextRequest("http://localhost/api/v1/guests");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    // When no pagination, meta should be undefined (backward compat)
    expect(json.meta).toBeUndefined();
  });
});

describe("GET /api/v1/guests/export streaming", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("streams CSV with header and batches, supports ?limit guard", async () => {
    const { GET } = await import("@/app/api/v1/guests/export/route");
    const guests = [
      { id: "1", name: "Alice", email: "a@b.com", category: "family", plusOne: false, plusOneName: null, rsvp: null, createdAt: new Date("2026-01-01T00:00:00.000Z") },
      { id: "2", name: "Bob", email: null, category: "friends", plusOne: true, plusOneName: "Eve", rsvp: { attending: true, headcount: 2, mealChoice: "meat", dietaryNotes: null, message: null, respondedAt: new Date("2026-01-02T00:00:00.000Z") }, createdAt: new Date("2026-01-03T00:00:00.000Z") },
    ];
    // Mock cursor batches: first batch returns guests, second empty
    let call = 0;
    mockFindMany.mockImplementation(async () => {
      call++;
      return call === 1 ? (guests as any) : [];
    });

    const req = new NextRequest("http://localhost/api/v1/guests/export");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/text\/csv/);
    // Read stream
    const text = await res.text();
    expect(text).toContain("id,name,email");
    expect(text).toContain("Alice");
    expect(text).toContain("Bob");
    // header + 2 rows = 3 lines
    const lines = text.trim().split("\n");
    expect(lines.length).toBe(3);
  });

  it("respects ?limit cap for export", async () => {
    const { GET } = await import("@/app/api/v1/guests/export/route");
    const guests = Array.from({ length: 5 }, (_, i) => ({
      id: `${i}`,
      name: `Guest${i}`,
      email: null,
      category: "family",
      plusOne: false,
      plusOneName: null,
      rsvp: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    }));
    let call = 0;
    mockFindMany.mockImplementation(async () => {
      call++;
      return call === 1 ? (guests as any) : [];
    });

    const req = new NextRequest("http://localhost/api/v1/guests/export?limit=2");
    const res = await GET(req);
    const text = await res.text();
    const lines = text.trim().split("\n");
    // header + 2 rows due to limit=2
    expect(lines.length).toBe(3);
  });

  it("returns 400 on invalid export limit", async () => {
    const { GET } = await import("@/app/api/v1/guests/export/route");
    const req = new NextRequest("http://localhost/api/v1/guests/export?limit=0");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
