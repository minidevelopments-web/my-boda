/**
 * @jest-environment node
 */
import { createGuestSession, createStaffSession } from "@/lib/auth";
import { resolveGalleryViewer } from "@/lib/gallery/viewer";

const mockFindUnique = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: { household: { findUnique: (...args: unknown[]) => mockFindUnique(...args) } },
}));

beforeEach(() => {
  process.env.ADMIN_PASSWORD = "secret";
  mockFindUnique.mockReset();
});

it("resolves a valid guest household and guest name", async () => {
  mockFindUnique.mockResolvedValue({
    id: "h1",
    expiresAt: null,
    guests: [{ id: "g1", name: "Ana" }],
  });
  const viewer = await resolveGalleryViewer(createGuestSession("h1", "g1"), undefined);
  expect(viewer).toEqual({ kind: "guest", householdId: "h1", guestId: "g1", name: "Ana" });
});

it("falls back to Guest when the guest row was deleted", async () => {
  mockFindUnique.mockResolvedValue({ id: "h1", expiresAt: null, guests: [] });
  const viewer = await resolveGalleryViewer(createGuestSession("h1", "gone"), undefined);
  expect(viewer).toMatchObject({ kind: "guest", name: "Guest" });
});

it("rejects an expired household and a bad token", async () => {
  mockFindUnique.mockResolvedValue({
    id: "h1",
    expiresAt: new Date(Date.now() - 1000),
    guests: [{ id: "g1", name: "Ana" }],
  });
  expect(await resolveGalleryViewer(createGuestSession("h1", "g1"), undefined)).toBeNull();
  expect(await resolveGalleryViewer("nonsense", undefined)).toBeNull();
});

it("resolves staff and prefers guest when both cookies exist", async () => {
  mockFindUnique.mockResolvedValue({
    id: "h1", expiresAt: null, guests: [{ id: "g1", name: "Ana" }],
  });
  expect(
    await resolveGalleryViewer(undefined, createStaffSession("u1", "COUPLE"))
  ).toEqual({ kind: "staff", role: "COUPLE" });
  expect(
    await resolveGalleryViewer(createGuestSession("h1", "g1"), createStaffSession("u1", "PLANNER"))
  ).toMatchObject({ kind: "guest" });
});
