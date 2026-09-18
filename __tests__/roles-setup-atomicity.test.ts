/**
 * @jest-environment node
 *
 * Regression: setup must be atomic — both user creates run inside a single
 * prisma.$transaction so a duplicate (P2002) on the second create rolls back
 * the first, leaving User.count() === 0 and setup retryable.
 */
import { NextRequest } from "next/server";

const mockCount = jest.fn();
const mockTransaction = jest.fn();
const mockDirectCreate = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      count: (...args: unknown[]) => mockCount(...args),
      // Direct creates must NOT be used by the handler anymore.
      create: (...args: unknown[]) => mockDirectCreate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

jest.mock("@/lib/passwords", () => ({
  hashPassword: jest.fn(async (pw: string) => `hashed:${pw}`),
}));

function setupRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/admin/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  sysadminEmail: "sys@example.com",
  sysadminPassword: "supersecurepw1",
  coupleEmail: "couple@example.com",
  couplePassword: "supersecurepw2",
};

describe("POST /api/v1/admin/setup atomicity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCount.mockResolvedValue(0);
  });

  it("wraps both user creates in a single $transaction (happy path → 201)", async () => {
    mockTransaction.mockImplementation(async (cb: any) => {
      const tx = {
        user: {
          create: jest.fn(async ({ data }: any) => ({
            id: `id-${data.email}`,
            email: data.email,
            role: data.role,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
          })),
        },
      };
      return cb(tx);
    });
    const { POST } = await import("@/app/api/v1/admin/setup/route");
    const res = await POST(setupRequest(validBody));
    expect(res.status).toBe(201);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    // Atomicity: no direct prisma.user.create outside the transaction.
    expect(mockDirectCreate).not.toHaveBeenCalled();
    const json = await res.json();
    expect(json.data.sysadmin.role).toBe("SYSADMIN");
    expect(json.data.couple.role).toBe("COUPLE");
  });

  it("sysadmin-ok + couple-duplicate → 409 with retry hint, count stays 0 (retryable)", async () => {
    // Simulate tx: first create succeeds, second throws P2002 → whole tx rejects.
    mockTransaction.mockImplementation(async (cb: any) => {
      const tx = {
        user: {
          create: jest.fn(async ({ data }: any) => {
            if (data.email === validBody.coupleEmail) {
              const err: any = new Error("Unique constraint failed");
              err.code = "P2002";
              throw err;
            }
            return { id: "id-sys", email: data.email, role: data.role, createdAt: new Date() };
          }),
        },
      };
      return cb(tx);
    });
    const { POST } = await import("@/app/api/v1/admin/setup/route");
    const res = await POST(setupRequest(validBody));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(String(json.error)).toMatch(/sysadmin|reset DB/i);
    expect(mockDirectCreate).not.toHaveBeenCalled();

    // Failed setup leaves count() === 0 → retry is not blocked by 403.
    mockCount.mockResolvedValue(0);
    mockTransaction.mockImplementation(async (cb: any) => {
      const tx = {
        user: {
          create: jest.fn(async ({ data }: any) => ({
            id: `id-${data.email}`,
            email: data.email,
            role: data.role,
            createdAt: new Date(),
          })),
        },
      };
      return cb(tx);
    });
    const retry = await POST(setupRequest(validBody));
    expect(retry.status).toBe(201);
  });
});
