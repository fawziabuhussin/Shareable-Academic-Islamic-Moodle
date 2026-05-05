'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { toDirectImageUrl } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

// Base64 encoded tiny placeholder (10x10 blurred gradient matching brand colors)
const BLUR_PLACEHOLDER = 
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHZpZXdCb3g9IjAgMCAxMCAxMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMxYTNhMmYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMyZDVhNGEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiLz48L3N2Zz4=';

/**
 * Optimized Image Component
 * - Uses Next.js Image for automatic optimization
 * - Adds blur placeholder during loading
 * - Lazy loads off-screen images by default
 * - Graceful fallback for invalid URLs
 */
export function OptimizedImage({
  src,
  alt,
  fill = false,
  width,
  height,
  className = '',
  priority = false,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Transform Google Drive URLs to direct-serving format
  const resolvedSrc = toDirectImageUrl(src) || src;

  // Quick validation: treat obviously invalid URLs as missing
  const isValidSrc = resolvedSrc && (resolvedSrc.startsWith('http://') || resolvedSrc.startsWith('https://') || resolvedSrc.startsWith('/'));

  // Timeout: if image hasn't loaded in 5s, show fallback
  useEffect(() => {
    if (!isValidSrc || loaded || error) return;
    const timer = setTimeout(() => {
      if (!loaded) setError(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isValidSrc, loaded, error]);

  // Fallback for missing or invalid images
  if (!isValidSrc || error) {
    return (
      <div 
        className={`bg-gradient-to-br from-[#1a3a2f] to-[#2d5a4a] flex items-center justify-center relative overflow-hidden ${fill ? 'absolute inset-0 w-full h-full' : ''} ${className}`}
        style={!fill ? { width, height } : undefined}
      >
        {/* Islamic arabesque pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.1]" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="islamic-geo" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              {/* Eight-pointed star (Rub el Hizb) */}
              <polygon points="50,10 61,39 90,39 67,56 74,85 50,68 26,85 33,56 10,39 39,39" fill="none" stroke="white" strokeWidth="0.8" />
              <polygon points="50,10 61,39 90,39 67,56 74,85 50,68 26,85 33,56 10,39 39,39" fill="none" stroke="white" strokeWidth="0.8" transform="rotate(45 50 50)" />
              {/* Inner octagon */}
              <polygon points="50,25 65,35 70,50 65,65 50,75 35,65 30,50 35,35" fill="none" stroke="white" strokeWidth="0.6" />
              {/* Center circle */}
              <circle cx="50" cy="50" r="8" fill="none" stroke="white" strokeWidth="0.6" />
              {/* Corner arcs connecting stars */}
              <path d="M0,0 Q25,10 50,0" fill="none" stroke="white" strokeWidth="0.5" />
              <path d="M50,0 Q75,10 100,0" fill="none" stroke="white" strokeWidth="0.5" />
              <path d="M0,100 Q25,90 50,100" fill="none" stroke="white" strokeWidth="0.5" />
              <path d="M50,100 Q75,90 100,100" fill="none" stroke="white" strokeWidth="0.5" />
              <path d="M0,0 Q10,25 0,50" fill="none" stroke="white" strokeWidth="0.5" />
              <path d="M0,50 Q10,75 0,100" fill="none" stroke="white" strokeWidth="0.5" />
              <path d="M100,0 Q90,25 100,50" fill="none" stroke="white" strokeWidth="0.5" />
              <path d="M100,50 Q90,75 100,100" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="400" height="400" fill="url(#islamic-geo)" />
        </svg>
        {/* Course title – dynamic size so the name fills the card */}
        <span className={`text-white font-bold opacity-90 text-center leading-snug px-5 relative z-10 ${
          (alt || '').length <= 12 ? 'text-3xl' :
          (alt || '').length <= 20 ? 'text-2xl' :
          (alt || '').length <= 35 ? 'text-xl' :
          (alt || '').length <= 55 ? 'text-lg' :
          'text-base'
        }`}>
          {alt || '؟'}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${fill ? 'w-full h-full' : ''}`}>
      <Image
        src={resolvedSrc}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        className={`object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        placeholder="blur"
        blurDataURL={BLUR_PLACEHOLDER}
        loading={priority ? 'eager' : 'lazy'}
        priority={priority}
        sizes={sizes}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
      {/* Show blur placeholder while loading */}
      {!loaded && (
        <div 
          className="absolute inset-0 bg-gradient-to-br from-[#1a3a2f] to-[#2d5a4a] animate-pulse"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

/**
 * Course Cover Image - Preset for course cards
 * Optimized sizes for course card layouts
 */
export function CourseCoverImage({
  src,
  alt,
  priority = false,
  className = '',
}: {
  src?: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src || ''}
      alt={alt}
      fill
      priority={priority}
      className={className}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
    />
  );
}
