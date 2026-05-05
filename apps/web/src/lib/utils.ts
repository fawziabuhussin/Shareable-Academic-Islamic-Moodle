import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Western locale for date/time (DD/MM/YYYY, 24h) */
const DATE_LOCALE = 'en-GB';

/**
 * Combines clsx and tailwind-merge for optimal class merging
 * Handles conditional classes and resolves Tailwind conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date in western format (DD/MM/YYYY).
 */
export function formatDate(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(DATE_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format date and time in western format (DD/MM/YYYY, HH:MM).
 */
export function formatDateTime(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  const datePart = d.toLocaleDateString(DATE_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString(DATE_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${datePart}, ${timePart}`;
}

/**
 * Format time only in western format (HH:MM), 24h.
 */
export function formatTime(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString(DATE_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Transform Google Drive URLs into direct-serving image URLs.
 * Google Drive's `uc?export=view` often fails in `<img>` tags due to redirects
 * and cookie consent pages. This converts to the direct CDN format.
 *
 * Supported input formats:
 *  - https://drive.google.com/uc?export=view&id=FILE_ID
 *  - https://drive.google.com/file/d/FILE_ID/view
 *  - https://drive.google.com/open?id=FILE_ID
 *  - https://drive.google.com/file/d/FILE_ID/...anything
 *
 * Output: https://lh3.googleusercontent.com/d/FILE_ID
 * Non-Drive URLs are returned unchanged.
 */
export function toDirectImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();

    if (!host.includes('drive.google.com')) return trimmed;

    // Format: /file/d/FILE_ID/...
    const fileMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      return `https://lh3.googleusercontent.com/d/${fileMatch[1]}`;
    }

    // Format: /open?id=FILE_ID  or  /uc?...&id=FILE_ID
    const idParam = parsed.searchParams.get('id');
    if (idParam) {
      return `https://lh3.googleusercontent.com/d/${idParam}`;
    }
  } catch {
    // Not a valid URL — return as-is
  }

  return trimmed;
}
