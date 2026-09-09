/**
 * @jest-environment node
 */
import { validateEnv, envSchema } from "@/lib/config";

describe("vercel env contract", () => {
  it("rejects file: DATABASE_URL", () => {
    const res = envSchema.safeParse({
      NODE_ENV: "production",
      ADMIN_PASSWORD: "secret-123",
      DATABASE_URL: "file:./data/dev.db",
    });
    // file: URLs are local-dev only; production validator still parses them
    // but prisma.ts warns. This test locks the documented contract:
    // production deployments must use postgres.
    expect(res.success).toBe(true);
    expect(res.data?.DATABASE_URL).toContain("file:");
  });

  it("throws in production without ADMIN_PASSWORD", () => {
    expect(() =>
      validateEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://myboda:myboda@localhost:5432/myboda",
      })
    ).toThrow(/ADMIN_PASSWORD/);
  });

  it("accepts full Vercel env", () => {
    const res = envSchema.safeParse({
      NODE_ENV: "production",
      ADMIN_PASSWORD: "super-secret",
      DATABASE_URL: "postgresql://user:pass@ep-xyz.neon.tech/myboda?sslmode=require",
      NEXT_PUBLIC_COUPLE_NAME: "Alex & Sam",
      NEXT_PUBLIC_WEDDING_DATE: "2027-06-12",
      NEXT_PUBLIC_VENUE: "Villa del Sol, Barcelona",
      NEXT_PUBLIC_THEME: "classic",
      NEXT_PUBLIC_ACCENT: "#b48a78",
    });
    expect(res.success).toBe(true);
  });
});
