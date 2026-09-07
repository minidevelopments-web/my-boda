/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { middleware } from "@/../middleware";

function req(path: string, acceptLanguage: string | null = null) {
  const headers = new Headers();
  if (acceptLanguage) headers.set("accept-language", acceptLanguage);
  return new NextRequest(new URL(`http://localhost${path}`), { headers });
}

test("C1: top-level /api/* never redirects (locale via header)", async () => {
  for (const p of ["/api/v1/rsvp", "/api/v1/auth", "/api/v1/guests", "/api/v1/guests/export"]) {
    const res = await middleware(req(p, "es-ES,es;q=0.9"));
    expect(res.headers.get("location")).toBeNull();
  }
});

test("C1: unauthenticated /api/v1/guests still 401s (no redirect)", async () => {
  const res = await middleware(req("/api/v1/guests"));
  expect(res.status).toBe(401);
  expect(res.headers.get("location")).toBeNull();
});

test("C2: invalid prefix strips first segment and sets cookie", async () => {
  const res = await middleware(req("/xx/info"));
  const loc = res.headers.get("location") ?? "";
  expect(loc).toBe("http://localhost/en/info");
  expect(res.headers.get("set-cookie") ?? "").toMatch(/locale=en/);
});

test("legacy unprefixed public path gains locale prefix", async () => {
  const res = await middleware(req("/info", "es-ES,es;q=0.9"));
  expect(res.headers.get("location")).toBe("http://localhost/es/info");
});
