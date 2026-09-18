/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { verifySessionEdge, parseRoleEdge, middleware, ADMIN_COOKIE_NAME } from "@/../middleware";
import { createStaffSession, createGuestSession, signSession } from "@/lib/auth";

process.env.ADMIN_PASSWORD = "test-secret-123";

function req(path: string, opts: { method?: string; token?: string; acceptLanguage?: string } = {}) {
  const headers = new Headers();
  if (opts.acceptLanguage) headers.set("accept-language", opts.acceptLanguage);
  if (opts.token) headers.set("cookie", `${ADMIN_COOKIE_NAME}=${opts.token}`);
  return new NextRequest(new URL(`http://localhost${path}`), {
    method: opts.method ?? "GET",
    headers,
  });
}

// ---- brief baseline ----
it("rejects empty token", async () => {
  expect(await verifySessionEdge(null)).toBe(false);
});

it("role payload shape documents userId.role convention", () => {
  const payload = `u1.PLANNER.${Date.now()}.ab12`;
  expect(payload.split(".").length).toBe(4);
});

// ---- Edge mirror: payload-shape agnostic expiry ----
it("verifySessionEdge accepts a valid staff role token", async () => {
  const tok = createStaffSession("u1", "PLANNER");
  expect(await verifySessionEdge(tok)).toBe(true);
});

it("verifySessionEdge still accepts a legacy pre-role token", async () => {
  const legacy = signSession(`${Date.now()}.abcdef`);
  expect(await verifySessionEdge(legacy)).toBe(true);
});

// ---- parseRoleEdge ----
describe("parseRoleEdge", () => {
  it("staff token -> role", () => {
    expect(parseRoleEdge(createStaffSession("u1", "PLANNER"))).toBe("PLANNER");
    expect(parseRoleEdge(createStaffSession("u1", "COUPLE"))).toBe("COUPLE");
    expect(parseRoleEdge(createStaffSession("u1", "SYSADMIN"))).toBe("SYSADMIN");
  });
  it("guest token -> GUEST", () => {
    expect(parseRoleEdge(createGuestSession("h1", "g1"))).toBe("GUEST");
  });
  it("legacy role-less token -> null (forces re-login)", () => {
    expect(parseRoleEdge(signSession(`${Date.now()}.abcdef`))).toBeNull();
  });
});

// ---- role matrix ----
describe("middleware role matrix", () => {
  it("SYSADMIN-only API: planner gets 401 on /api/v1/admin/users", async () => {
    const res = await middleware(req("/api/v1/admin/users", { token: createStaffSession("u1", "PLANNER") }));
    expect(res.status).toBe(401);
  });
  it("SYSADMIN-only API: sysadmin passes /api/v1/admin/users", async () => {
    const res = await middleware(req("/api/v1/admin/users", { token: createStaffSession("u9", "SYSADMIN") }));
    expect(res.status).not.toBe(401);
  });
  it("SYSADMIN-only page: planner redirected to login from /en/admin/system", async () => {
    const res = await middleware(req("/en/admin/system", { token: createStaffSession("u1", "PLANNER") }));
    expect(res.headers.get("location")).toMatch(/\/en\/login/);
  });
  it("staff area: legacy role-less token redirected to login (re-login)", async () => {
    const legacy = signSession(`${Date.now()}.abcdef`);
    const res = await middleware(req("/en/admin", { token: legacy }));
    expect(res.headers.get("location")).toMatch(/\/en\/login/);
  });
  it("staff area: couple passes /en/admin", async () => {
    const res = await middleware(req("/en/admin", { token: createStaffSession("u2", "COUPLE") }));
    expect(res.headers.get("location")).toBeNull();
    expect(res.status).not.toBe(401);
  });
  it("POST /api/v1/admin/planners: couple allowed, planner denied", async () => {
    const ok = await middleware(
      req("/api/v1/admin/planners", { method: "POST", token: createStaffSession("u2", "COUPLE") })
    );
    expect(ok.status).not.toBe(401);
    const denied = await middleware(
      req("/api/v1/admin/planners", { method: "POST", token: createStaffSession("u1", "PLANNER") })
    );
    expect(denied.status).toBe(401);
  });
  it("always-allow routes pass without a token", async () => {
    for (const p of ["/en/setup", "/en/login", "/api/v1/guest/verify", "/api/v1/rsvp", "/api/v1/auth"]) {
      const res = await middleware(req(p));
      expect(res.headers.get("location")).toBeNull();
      expect(res.status).not.toBe(401);
    }
  });
});
