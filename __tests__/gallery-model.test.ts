import fs from "fs";

it("declares the GalleryPhoto model and fields", () => {
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
  expect(schema).toMatch(/model GalleryPhoto/);
  for (const field of [
    "householdId", "guestId", "uploaderName", "caption",
    "fileName", "thumbName", "mimeType", "width", "height", "bytes",
  ]) {
    expect(schema).toContain(field);
  }
  expect(schema).toMatch(/@@index\(\[createdAt\]\)/);
});

it("declares sharp as a direct dependency", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  expect(pkg.dependencies.sharp).toBeDefined();
});
