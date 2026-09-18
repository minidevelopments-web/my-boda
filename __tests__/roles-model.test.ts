// __tests__/roles-model.test.ts
import fs from "fs";
it("schema declares User, Household and Guest.householdId", () => {
  const s = fs.readFileSync("prisma/schema.prisma", "utf8");
  expect(s).toMatch(/model User/);
  expect(s).toMatch(/enum Role/);
  expect(s).toMatch(/COUPLE/);
  expect(s).toMatch(/PLANNER/);
  expect(s).toMatch(/SYSADMIN/);
  expect(s).toMatch(/model Household/);
  expect(s).toMatch(/inviteCode/);
  expect(s).toMatch(/householdId/);
});
it("bcryptjs is a dependency", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  expect(pkg.dependencies["bcryptjs"]).toBeDefined();
});
