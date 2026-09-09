import fs from "node:fs";
import path from "node:path";
import { generateMetadata } from "@/app/[lang]/layout";

const ROOT = path.join(__dirname, "..");

describe("public web assets (#39)", () => {
  it("serves favicon assets", () => {
    expect(fs.existsSync(path.join(ROOT, "public", "favicon.ico"))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, "public", "favicon.svg"))).toBe(true);
  });

  it("serves OG image + touch icon", () => {
    expect(fs.existsSync(path.join(ROOT, "public", "og-image.png"))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, "public", "apple-touch-icon.png"))).toBe(true);
  });

  it("references favicon + OG image from app metadata", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ lang: "en" }) });
    const icons = meta.icons as { icon?: Array<{ url: string }>; apple?: string };
    const iconUrls = (icons?.icon ?? []).map((i) => i.url);
    expect(iconUrls).toContain("/favicon.ico");
    expect(iconUrls).toContain("/favicon.svg");
    expect(icons?.apple).toBe("/apple-touch-icon.png");
    const ogImages = (meta.openGraph as { images?: Array<{ url: string }> })?.images ?? [];
    expect(ogImages.map((i) => i.url)).toContain("/og-image.png");
  });
});
