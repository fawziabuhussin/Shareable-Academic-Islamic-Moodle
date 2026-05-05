/**
 * Default CORS allowlist for production browser clients.
 * Prefer overriding via FRONTEND_URL / CORS_ORIGIN environment variables
 * rather than editing this file directly.
 */
export const PRODUCTION_FRONTEND_ORIGINS = [
  'https://your-domain.com',
  'https://www.your-domain.com',
] as const;

export const LEGACY_VERCEL_FRONTEND_ORIGINS = [
  'https://your-web-project.vercel.app',
] as const;
