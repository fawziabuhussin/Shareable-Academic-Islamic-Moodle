'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { toDirectImageUrl } from '@/lib/utils';

interface LightboxImage {
  imageUrl: string;
  order?: number;
}

interface ImageLightboxProps {
  /** Array of images to display */
  images: LightboxImage[];
  /** Max height class for thumbnails (e.g. "max-h-48", "max-h-56") */
  maxHeight?: string;
  /** Width/height for next/image (thumbnails) */
  thumbWidth?: number;
  thumbHeight?: number;
  /** Show order badges when more than 1 image */
  showBadges?: boolean;
}

/**
 * Clickable image gallery with fullscreen lightbox overlay.
 * Supports keyboard navigation (←/→/Esc) and swipe-like click navigation.
 */
export default function ImageLightbox({
  images,
  maxHeight = 'max-h-48',
  thumbWidth = 400,
  thumbHeight = 300,
  showBadges = true,
}: ImageLightboxProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const close = useCallback(() => setActiveIndex(null), []);
  const prev = useCallback(() => {
    setActiveIndex((i) => (i !== null && i > 0 ? i - 1 : i));
  }, []);
  const next = useCallback(() => {
    setActiveIndex((i) => (i !== null && i < images.length - 1 ? i + 1 : i));
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (activeIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // In RTL context, ArrowRight = prev, ArrowLeft = next
        if (e.key === 'ArrowRight') prev();
        else next();
      }
    };
    document.addEventListener('keydown', handler);
    // Prevent body scroll while lightbox is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [activeIndex, close, prev, next]);

  if (!images || images.length === 0) return null;

  const showOrderBadges = showBadges && images.length > 1;

  return (
    <>
      {/* Thumbnail gallery */}
      <div className="mt-2 flex flex-wrap gap-2">
        {images.map((img, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveIndex(idx)}
            className="relative group cursor-zoom-in rounded-lg overflow-hidden border border-stone-200 hover:border-stone-400 transition focus:outline-none focus:ring-2 focus:ring-[#1a3a2f]"
          >
            {showOrderBadges && (
              <span className="absolute top-1 right-1 z-10 w-5 h-5 bg-[#1a3a2f] text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow">
                {idx + 1}
              </span>
            )}
            <Image
              src={toDirectImageUrl(img.imageUrl) || img.imageUrl}
              alt={`صورة ${idx + 1}`}
              width={thumbWidth}
              height={thumbHeight}
              className={`${maxHeight} rounded-lg object-contain w-auto transition group-hover:opacity-90`}
            />
            {/* Zoom hint on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
              <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-80 transition drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox overlay */}
      {activeIndex !== null && (
        <div
          className="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center"
          onClick={close}
        >
          {/* Close button */}
          <button
            onClick={close}
            className="absolute top-4 left-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition"
            aria-label="إغلاق"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Counter */}
          {images.length > 1 && (
            <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-white/10 rounded-full text-white text-sm font-medium">
              {activeIndex + 1} / {images.length}
            </div>
          )}

          {/* Previous button */}
          {images.length > 1 && activeIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition"
              aria-label="السابق"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Next button */}
          {images.length > 1 && activeIndex < images.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition"
              aria-label="التالي"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Main image */}
          <div
            className="relative max-w-[90vw] max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={toDirectImageUrl(images[activeIndex].imageUrl) || images[activeIndex].imageUrl}
              alt={`صورة ${activeIndex + 1}`}
              width={1200}
              height={900}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
              priority
            />
          </div>
        </div>
      )}
    </>
  );
}
