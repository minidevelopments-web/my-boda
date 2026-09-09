import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "..");

describe("docs assets (#41)", () => {
  it("hero banner exists and is referenced by README", () => {
    expect(fs.existsSync(path.join(ROOT, "docs", "assets", "hero-banner.png"))).toBe(true);
    const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
    expect(readme).toMatch(/docs\/assets\/hero-banner\.png/);
  });

  it("one preview per theme exists and renders in README table", () => {
    for (const theme of ["classic", "modern", "garden"]) {
      const p = path.join(ROOT, "docs", "assets", `theme-${theme}.gif`);
      expect(fs.existsSync(p)).toBe(true);
      expect(fs.statSync(p).size).toBeGreaterThan(0);
    }
    const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
    expect(readme).toMatch(/theme-classic\.gif/);
    expect(readme).toMatch(/theme-modern\.gif/);
    expect(readme).toMatch(/theme-garden\.gif/);
  });

  it("placeholder note is resolved", () => {
    const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
    expect(readme).not.toMatch(/GIF placeholders/);
  });
});
