// __tests__/admin-i18n.test.tsx
import { getDictionary } from "@/lib/i18n";
test("admin dicts differ per locale", () => {
  expect(getDictionary("de").admin.guests).not.toBe(getDictionary("en").admin.guests);
});
