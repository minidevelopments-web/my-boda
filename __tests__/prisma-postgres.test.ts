/**
 * @jest-environment node
 */
describe("prisma postgres runtime", () => {
  it("does not depend on better-sqlite3 adapter", () => {
    const pkg = require("../package.json");
    expect(pkg.dependencies["better-sqlite3"]).toBeUndefined();
    expect(pkg.dependencies["@prisma/adapter-better-sqlite3"]).toBeUndefined();
  });

  it("accepts postgresql DATABASE_URL via envSchema", async () => {
    const { envSchema } = await import("@/lib/config");
    const res = envSchema.safeParse({
      NODE_ENV: "production",
      ADMIN_PASSWORD: "test-secret-123",
      DATABASE_URL: "postgresql://myboda:myboda@postgres:5432/myboda",
    });
    expect(res.success).toBe(true);
  });
});
