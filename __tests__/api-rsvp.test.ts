/**
 * @jest-environment node
 */
import { rsvpSchema, guestUpdateSchema } from "@/lib/validators";
import { NextRequest } from "next/server";

// ---- Schema tests (keep from Task 2) ----
describe("rsvpSchema", () => {
  it("rejects empty name", () => {
    expect(rsvpSchema.safeParse({ name: "", attending: true, headcount: 1 }).success).toBe(false);
  });
  it("accepts valid RSVP with mealChoice", () => {
    expect(rsvpSchema.safeParse({ name: "Lena", attending: true, headcount: 2, mealChoice: "vegetarian" }).success).toBe(true);
  });
  it("rejects invalid mealChoice", () => {
    expect(rsvpSchema.safeParse({ name: "Lena", attending: true, headcount: 1, mealChoice: "invalid" }).success).toBe(false);
  });
  it("rejects headcount 0", () => {
    expect(rsvpSchema.safeParse({ name: "Lena", attending: true, headcount: 0 }).success).toBe(false);
  });
  it("allows attending false", () => {
    expect(rsvpSchema.safeParse({ name: "Lena", attending: false, headcount: 1 }).success).toBe(true);
  });
});

describe("guestUpdateSchema", () => {
  it("accepts valid category", () => {
    expect(guestUpdateSchema.safeParse({ category: "friends" }).success).toBe(true);
  });
  it("rejects invalid category", () => {
    expect(guestUpdateSchema.safeParse({ category: "invalid" }).success).toBe(false);
  });
});

// ---- Integration tests via prisma transaction + upsert ----
const mockGuestCreate = jest.fn();
const mockGuestFindFirst = jest.fn();
const mockGuestFindUnique = jest.fn();
const mockGuestUpdate = jest.fn();
const mockRsvpUpsert = jest.fn();
const mockTransaction = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    guest: {
      findFirst: (...args: unknown[]) => mockGuestFindFirst(...args),
      findUnique: (...args: unknown[]) => mockGuestFindUnique(...args),
      create: (...args: unknown[]) => mockGuestCreate(...args),
      update: (...args: unknown[]) => mockGuestUpdate(...args),
    },
    rsvpResponse: {
      upsert: (...args: unknown[]) => mockRsvpUpsert(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

describe("POST /api/rsvp integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGuestFindFirst.mockResolvedValue(null);
    mockGuestFindUnique.mockResolvedValue(null);
    mockGuestCreate.mockResolvedValue({ id: "guest_123", name: "Test Guest", email: null });
    mockGuestUpdate.mockResolvedValue({ id: "guest_123", name: "Test Guest" });
    mockRsvpUpsert.mockResolvedValue({ id: "rsvp_123", guestId: "guest_123", attending: true, headcount: 2 });
    // Default transaction behavior: execute callback with tx (here we simulate tx as same prisma)
    mockTransaction.mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (fn as any)({
          guest: { findFirst: mockGuestFindFirst, findUnique: mockGuestFindUnique, create: mockGuestCreate, update: mockGuestUpdate },
          rsvpResponse: { upsert: mockRsvpUpsert },
        });
      }
      // array form
      return Promise.resolve([]);
    });
  });

  it("POST /api/rsvp creates guest and rsvp (expect 201)", async () => {
    const { POST } = await import("@/app/api/rsvp/route");
    const req = new NextRequest("http://localhost/api/rsvp", {
      method: "POST",
      body: JSON.stringify({ name: "Test Guest", attending: true, headcount: 2 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.guest).toBeDefined();
    expect(json.data.rsvp).toBeDefined();
  });

  it("uses prisma.$transaction for upsert", async () => {
    const { POST } = await import("@/app/api/rsvp/route");
    const req = new NextRequest("http://localhost/api/rsvp", {
      method: "POST",
      body: JSON.stringify({ name: "Tx Guest", attending: true, headcount: 1 }),
    });
    await POST(req);
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("coerces headcount to 1 when attending false", async () => {
    const { POST } = await import("@/app/api/rsvp/route");
    const req = new NextRequest("http://localhost/api/rsvp", {
      method: "POST",
      body: JSON.stringify({ name: "No Guest", attending: false, headcount: 5 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    // upsert should have been called with headcount 1 when not attending
    const upsertArgs = mockRsvpUpsert.mock.calls[0]?.[0] as { create?: { headcount?: number }; update?: { headcount?: number } };
    const headcount = upsertArgs?.create?.headcount ?? upsertArgs?.update?.headcount;
    expect(headcount).toBe(1);
  });

  it("dedups by email via findFirst when email provided", async () => {
    mockGuestFindFirst.mockResolvedValue({ id: "existing_123", name: "Existing", email: "lena@example.com" });
    const { POST } = await import("@/app/api/rsvp/route");
    const req = new NextRequest("http://localhost/api/rsvp", {
      method: "POST",
      body: JSON.stringify({ name: "Lena", email: "lena@example.com", attending: true, headcount: 1 }),
    });
    await POST(req);
    expect(mockGuestFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "lena@example.com" } }));
    expect(mockGuestCreate).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid payload", async () => {
    const { POST } = await import("@/app/api/rsvp/route");
    const req = new NextRequest("http://localhost/api/rsvp", {
      method: "POST",
      body: JSON.stringify({ name: "", attending: true, headcount: 0 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
