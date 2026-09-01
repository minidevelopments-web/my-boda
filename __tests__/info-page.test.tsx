import { getSiteConfig } from "@/lib/config";
it("parses schedule from env", () => {
  process.env.NEXT_PUBLIC_SCHEDULE_JSON = JSON.stringify([{ time: "18:00", title: "Ceremony" }]);
  const cfg = getSiteConfig();
  expect(cfg.schedule).toHaveLength(1);
});
