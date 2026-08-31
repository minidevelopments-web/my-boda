import { getSiteConfig } from "@/lib/config";
describe("bootstrap", () => {
  it("returns site config with defaults", () => {
    const cfg = getSiteConfig();
    expect(cfg.coupleName).toBeDefined();
    expect(cfg.theme).toMatch(/classic|modern|garden/);
  });
});
