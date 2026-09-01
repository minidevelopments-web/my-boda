# Database Connection Strategy

**Objective:** Establish a consistent and secure method for injecting the `DATABASE_URL` environment variable across Development and Production environments.

## 1. Infrastructure Strategy

We will leverage **Vercel's Environment Variables** for all environments.

*   **Dev Environment:** Environment variables are injected via Vercel settings, allowing easy local overrides via a `.env` file. The default connection string will use a local file path for convenience.
*   **Prod Environment:** Connection strings will be strictly managed via Vercel's built-in Secret management. This ensures the connection string is only available at runtime within the deployed environment, preventing exposure.

## 2. `DATABASE_URL` Injection Strategy

The core principle is **Runtime Source of Truth**. The application must *always* derive the connection string from an environment variable, regardless of the environment.

*   **Single Source of Truth:** A centralized configuration source (e.g., `config.ts` or a base `.env.example`) will define the *structure* of the connection (protocol, credentials, host format).
*   **Environment Variable Mapping:**
    *   **Development:** The environment variable will map to a local file path (e.g., `file:./data/dev.db`).
    *   **Production:** The environment variable will map to a secure, fully qualified connection string provided by Vercel Secrets.
*   **Prisma Configuration:** The application must be updated to read `DATABASE_URL` directly from the environment variables, strictly forbidding file-based fallbacks in the application logic. This ensures that testing against a development environment with the production connection string will yield consistent results.

## 3. Trade-offs

| Aspect | Detail | Impact |
| :--- | :--- | :--- |
| **Consistency** | Single source of truth for connection structure. | High consistency between local testing and production. |
| **Security** | Strict reliance on Vercel Secrets for Production. | Maximizes security for sensitive production credentials. |
| **Flexibility** | Strict requirement to find a valid URL at runtime. | Reduces development convenience (no file-based default). |

## 4. Implementation Goals

1.  **Refactor Prisma Logic:** Remove any static file path fallbacks from `prisma.config.ts` or related initialization code.
2.  **Environment Enforcement:** Ensure the application fails loudly with a clear error if `DATABASE_URL` is not present in the runtime environment.
3.  **Code Style:** Follow existing patterns for environment variable reading and structure.