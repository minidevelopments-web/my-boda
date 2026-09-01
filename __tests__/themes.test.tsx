import { themes } from "@/lib/themes";
it("registers 3 themes", () => { expect(Object.keys(themes)).toHaveLength(3); });
it("each theme has Component", () => { for (const t of Object.values(themes)) expect(typeof t.Component).toBe("function"); });
