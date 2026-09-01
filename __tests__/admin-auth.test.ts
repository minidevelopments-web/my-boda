// __tests__/admin-auth.test.ts
import { isValidPassword } from "@/lib/auth";

it("validates admin password", () => {
  process.env.ADMIN_PASSWORD = "secret";
  expect(isValidPassword("secret")).toBe(true);
  expect(isValidPassword("wrong")).toBe(false);
});
