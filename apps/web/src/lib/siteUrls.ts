/**
 * Canonical production URLs — override via environment variables in production.
 * Replace these fallback values with your real public domains.
 */
export const PRODUCTION_FRONTEND_ORIGIN = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://your-domain.com';
export const PRODUCTION_API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'https://api.your-domain.com';
/** Legacy Vercel host — update to your own Vercel project URL if needed. */
export const LEGACY_VERCEL_API_ORIGIN = 'https://your-api-project.vercel.app';

export const PRODUCTION_FRONTEND_HOSTNAMES = ['your-domain.com', 'www.your-domain.com'] as const;

/** Add any additional preview/alias hostnames here. */
export const TYPO_FRONTEND_HOSTNAMES = ['preview.your-domain.com'] as const;
