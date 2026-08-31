import { rsvpSchema, guestUpdateSchema } from "@/lib/validators";

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
