// __tests__/roles-libs.test.ts
import { canAccess } from "@/lib/roles";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { generateInviteCode, normalizeInviteCode } from "@/lib/inviteCodes";

it("planner can guests but not users/system", () => {
  expect(canAccess("PLANNER", "guests")).toBe(true);
  expect(canAccess("PLANNER", "users")).toBe(false);
  expect(canAccess("PLANNER", "system")).toBe(false);
});
it("sysadmin can everything, couple can guests+content not users/system-write", () => {
  expect(canAccess("SYSADMIN", "system")).toBe(true);
  expect(canAccess("COUPLE", "guests")).toBe(true);
  expect(canAccess("COUPLE", "users")).toBe(false);
});
it("bcrypt round-trip", async () => {
  const h = await hashPassword("correct horse 123");
  expect(await verifyPassword("correct horse 123", h)).toBe(true);
  expect(await verifyPassword("wrong", h)).toBe(false);
}, 15000);
it("invite codes are 12-char uppercase", () => {
  const c = generateInviteCode();
  expect(c).toMatch(/^[A-Z0-9]{12}$/);
  expect(normalizeInviteCode("  ab-12 cd ")).toBe("AB12CD");
});
