/**
 * @jest-environment node
 */
describe("prisma postgres runtime", () => {
  it("does not depend on better-sqlite3 adapter", () => {
    const pkg = require("../package.json");
    expect(pkg.dependencies["better-sqlite3"]).toBeUndefined();
    expect(pkg.dependencies["@prisma/adapter-better-sqlite3"]).toBeUndefined();
  });

  it("depends on the pg driver adapter", () => {
    const pkg = require("../package.json");
    expect(pkg.dependencies["@prisma/adapter-pg"]).toBeDefined();
  });

  it("wires PrismaPg adapter in src/lib/prisma.ts", () => {
    const fs = require("fs");
    const path = require("path");
    const src = fs.readFileSync(path.join(__dirname, "../src/lib/prisma.ts"), "utf8");
    expect(src).toContain("PrismaPg");
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
