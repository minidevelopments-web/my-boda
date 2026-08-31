import { rsvpSchema } from "@/lib/validators";
it("rejects empty name", () => {
  expect(rsvpSchema.safeParse({ name: "", attending: true, headcount: 1 }).success).toBe(false);
});
it("accepts valid RSVP", () => {
  expect(rsvpSchema.safeParse({ name: "Lena", attending: true, headcount: 2, mealChoice: "vegetarian" }).success).toBe(true);
});
