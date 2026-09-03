/**
 * In-memory rate limiter for auth brute-force protection.
 * Single-instance only (SQLite / single container). For multi-instance,
 * replace with Redis / KV store.
 */

type Entry = { count: number; resetAt: number };

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

const store: Map<string, Entry> = (() => {
  const g = globalThis as unknown as { __rateLimitStore?: Map<string, Entry> };
  if (!g.__rateLimitStore) g.__rateLimitStore = new Map<string, Entry>();
  return g.__rateLimitStore;
})();

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs: number; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterMs: 0, remaining: MAX_ATTEMPTS - 1 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: entry.resetAt - now, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, retryAfterMs: 0, remaining: MAX_ATTEMPTS - entry.count };
}

// For tests
export function clearRateLimitStore(): void {
  store.clear();
}

export function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  // NextRequest may have ip property but not in standard Request
  const anyReq = req as unknown as { ip?: string };
  if (anyReq.ip) return anyReq.ip;
  return "unknown";
}
