/**
 * Next.js instrumentation — runs once at server startup (Node runtime).
 * Validates configuration via Zod before the app serves traffic.
 * - In production: throws on missing/invalid critical env (fail-fast).
 * - In development: warns but continues with safe defaults.
 *
 * Enabled via `experimental.instrumentationHook` in next.config.mjs
 * (auto-enabled in Next 16 for instrumentation.ts at project root or src/).
 */
export async function register() {
  // Only run in Node runtime, not Edge.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { validateConfigAtStartup } = await import("./lib/config");
      validateConfigAtStartup();
      // Optional: log success in dev for visibility
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log("[config] ✓ Configuration validated at startup");
      }
    } catch (err) {
      // Re-throw to crash startup in production; Next will surface the error
      console.error("[config] ✗ Startup validation failed:", err);
      if (process.env.NODE_ENV === "production") throw err;
    }
  }
}
