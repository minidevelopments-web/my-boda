/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  async rewrites() {
    return [
      // Legacy (unversioned) API paths → versioned v1 handlers.
      // File-system wrappers at `src/app/api/<domain>/route.ts` already
      // re-export the v1 handlers for backward compatibility (including
      // the `import "@/app/api/…/route"` used in tests), so these
      // rewrites are an additional runtime safety net for external
      // clients still fetching the old URLs. They are intentionally
      // idempotent with the wrappers — either layer alone keeps legacy
      // traffic working, and both together make the intent explicit.
      { source: "/api/guests", destination: "/api/v1/guests" },
      { source: "/api/guests/:path*", destination: "/api/v1/guests/:path*" },
      { source: "/api/rsvp", destination: "/api/v1/rsvp" },
      { source: "/api/rsvp/:path*", destination: "/api/v1/rsvp/:path*" },
      // Auth is canonical at both `/api/auth` and `/api/v1/auth`
      // (wrappers in both directions), so no rewrite is required.
    ];
  },
};
export default nextConfig;
