/**
 * Backward-compatible wrapper for the versioned Auth API.
 * Canonical implementation lives at `src/app/api/v1/auth/route.ts`.
 * This file re-exports the handlers to keep `/api/auth` working.
 */
export { GET, POST, DELETE } from "../v1/auth/route";
