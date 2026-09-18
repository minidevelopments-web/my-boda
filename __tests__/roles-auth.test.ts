// __tests__/roles-auth.test.ts
import { createStaffSession, parseStaffSession, createGuestSession, parseGuestSession } from "@/lib/auth";
it("staff session round-trips userId+role", () => {
  process.env.ADMIN_PASSWORD = "test-secret-123";
  const tok = createStaffSession("u1", "PLANNER");
  expect(parseStaffSession(tok)).toEqual(expect.objectContaining({ userId: "u1", role: "PLANNER" }));
});
it("legacy token without role parses as null role", () => {
  process.env.ADMIN_PASSWORD = "test-secret-123";
  const { signSession } = require("@/lib/auth");
  const legacy = signSession(`${Date.now()}.abcdef`);
  expect(parseStaffSession(legacy)?.role).toBeUndefined();
});
it("guest session round-trips household", () => {
  process.env.ADMIN_PASSWORD = "test-secret-123";
  const tok = createGuestSession("h1", "g1");
  expect(parseGuestSession(tok)).toEqual(expect.objectContaining({ householdId: "h1", guestId: "g1" }));
});
