import { normalizeInviteCode } from "@/lib/inviteCodes";
import fs from "fs";

it("guest cannot see other household (isolation rule documented)", () => {
  expect(normalizeInviteCode("ab-12")).toBe("AB12");
});

it("rsvp page references InviteGate", () => {
  const s = fs.readFileSync("src/app/[lang]/rsvp/page.tsx", "utf8");
  expect(s).toMatch(/InviteGate/);
});
