/**
 * @jest-environment node
 *
 * Regression: guests handlers must reject legacy role-less tokens
 * (signSession `${ts}.${rand}`, no role) with 401 JSON semantics.
 */
import { NextRequest } from "next/server";

process.env.ADMIN_PASSWORD = "test-secret-legacy-401";

function legacyToken(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { signSession } = require("@/lib/auth");
  return signSession(`${Date.now()}.abcdef123456`);
}

function authedGet(url: string): NextRequest {
  const req = new NextRequest(url);
  req.cookies.set("admin_session", legacyToken());
  return req;
}

describe("guests handlers reject legacy role-less tokens", () => {
  it("GET /api/v1/guests → 401", async () => {
    const { GET } = await import("@/app/api/v1/guests/route");
    const res = await GET(authedGet("http://localhost/api/v1/guests"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("PATCH /api/v1/guests/[id] → 401", async () => {
    const { PATCH } = await import("@/app/api/v1/guests/[id]/route");
    const req = authedGet("http://localhost/api/v1/guests/abc");
    const res = await PATCH(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("GET /api/v1/guests/export → 401", async () => {
    const { GET } = await import("@/app/api/v1/guests/export/route");
    const res = await GET(authedGet("http://localhost/api/v1/guests/export"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });
});
