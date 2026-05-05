/**
 * Public site header visual surface.
 * - brand: solid forest bar, light text (home / dark hero overlap).
 * - light: solid warm off-white bar, dark text (content pages on #fdfbf7).
 */
export type PublicHeaderSurface = 'brand' | 'light';

/**
 * Single source of truth: which routes use the dark "brand" bar vs light bar.
 * Everything under PublicLayout defaults to light except the home hero.
 */
export function getPublicHeaderSurface(pathname: string | null): PublicHeaderSurface {
  if (!pathname || pathname === '/') return 'brand';
  return 'light';
}
