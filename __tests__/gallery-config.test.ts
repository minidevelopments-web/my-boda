import fs from "fs";

it("documents UPLOAD_DIR", () => {
  expect(fs.readFileSync(".env.example", "utf8")).toMatch(/UPLOAD_DIR/);
  expect(fs.readFileSync("README.md", "utf8")).toMatch(/UPLOAD_DIR/);
});

it("persists uploads in docker compose", () => {
  const compose = fs.readFileSync("docker-compose.yml", "utf8");
  expect(compose).toMatch(/UPLOAD_DIR=\/app\/data\/uploads/);
  expect(compose).toMatch(/uploads_data:\/app\/data\/uploads/);
  expect(compose).toMatch(/uploads_data:/);
});

it("documents the Vercel limitation", () => {
  expect(fs.readFileSync("docs/VERCEL.md", "utf8")).toMatch(/gallery/i);
});
