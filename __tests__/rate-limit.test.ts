import { checkRateLimit, clearRateLimitStore } from "@/lib/rateLimit";

beforeEach(() => clearRateLimitStore());

it("keeps the 5-attempt default", () => {
  for (let i = 0; i < 5; i++) expect(checkRateLimit("default").allowed).toBe(true);
  expect(checkRateLimit("default").allowed).toBe(false);
});

it("honors custom limits", () => {
  expect(checkRateLimit("custom", { maxAttempts: 2, windowMs: 60_000 }).allowed).toBe(true);
  expect(checkRateLimit("custom", { maxAttempts: 2, windowMs: 60_000 }).allowed).toBe(true);
  expect(checkRateLimit("custom", { maxAttempts: 2, windowMs: 60_000 }).allowed).toBe(false);
});
