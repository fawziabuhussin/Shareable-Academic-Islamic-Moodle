'use client';

import Image from 'next/image';
import { useState } from 'react';
import { toDirectImageUrl } from '@/lib/utils';

interface CourseThumbnailProps {
  /** Image URL for the course cover */
  src?: string | null;
  /** Course title — used for alt text and letter fallback */
  title: string;
  /** Height in pixels. Default 40 */
  height?: number;
  /** Width in pixels. Default 56 (landscape ratio, shows more of the cover) */
  width?: number;
  /** Additional CSS classes on the outer container */
  className?: string;
}

/**
 * Compact course thumbnail for admin/table contexts.
 * - Landscape rectangle (56×40 by default) so cover images aren't overly cropped.
 * - Uses Next.js Image (proxied via /_next/image) so Google Drive etc. work.
 * - Shows a loading pulse, then the image or a letter-on-gradient fallback.
 */
export default function CourseThumbnail({
  src,
  title,
  height = 40,
  width = 56,
  className = '',
}: CourseThumbnailProps) {
  const [imgError, setImgError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Transform Google Drive URLs to direct-serving format
  const resolvedSrc = toDirectImageUrl(src) || src;

  const isValidSrc =
    !!resolvedSrc &&
    (resolvedSrc.startsWith('http://') ||
      resolvedSrc.startsWith('https://') ||
      resolvedSrc.startsWith('/'));

  const showImage = isValidSrc && !imgError;

  // Derive a readable first character (supports Arabic letters)
  const letter = title.trim().charAt(0) || '?';

  // Scale font size relative to container height
  const fontSize = Math.round(height * 0.45);

  return (
    <div
      className={`relative flex-shrink-0 rounded-lg overflow-hidden ring-1 ring-stone-200 ${className}`}
      style={{ width, height }}
    >
      {showImage ? (
        <>
          <Image
            src={resolvedSrc!}
            alt={title}
            fill
            sizes={`${width * 2}px`}
            className={`object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
            onError={() => setImgError(true)}
          />
          {!loaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a3a2f] to-[#2d5a4a] animate-pulse" />
          )}
        </>
      ) : (
        <div
          className="w-full h-full bg-gradient-to-br from-[#1a3a2f] to-[#2d5a4a] flex items-center justify-center text-white font-bold select-none"
          style={{ fontSize }}
          aria-hidden="true"
        >
          {letter}
        </div>
      )}
    </div>
  );
}
