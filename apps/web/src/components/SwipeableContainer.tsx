'use client';

import { useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { useSwipeNavigation } from '@/lib/hooks/useSwipe';

interface SwipeableContainerProps {
  children: ReactNode[];
  /** Show navigation dots */
  showDots?: boolean;
  /** Show navigation arrows on non-touch devices */
  showArrows?: boolean;
  /** Items visible at once (for grid layouts) */
  itemsPerView?: number;
  /** Gap between items in px */
  gap?: number;
  /** Additional class for container */
  className?: string;
  /** Callback when index changes */
  onIndexChange?: (index: number) => void;
}

/**
 * A swipeable container component for mobile-friendly carousels
 * 
 * @example
 * ```tsx
 * <SwipeableContainer showDots showArrows>
 *   <CourseCard course={course1} />
 *   <CourseCard course={course2} />
 *   <CourseCard course={course3} />
 * </SwipeableContainer>
 * ```
 */
export default function SwipeableContainer({
  children,
  showDots = true,
  showArrows = true,
  itemsPerView = 1,
  gap = 16,
  className = '',
  onIndexChange,
}: SwipeableContainerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const totalItems = children.length;
  const maxIndex = Math.max(0, totalItems - itemsPerView);

  const goToIndex = useCallback((index: number) => {
    const newIndex = Math.max(0, Math.min(index, maxIndex));
    setCurrentIndex(newIndex);
    onIndexChange?.(newIndex);
  }, [maxIndex, onIndexChange]);

  const goNext = useCallback(() => {
    goToIndex(currentIndex + 1);
  }, [currentIndex, goToIndex]);

  const goPrevious = useCallback(() => {
    goToIndex(currentIndex - 1);
  }, [currentIndex, goToIndex]);

  // Swipe handlers (RTL-aware)
  const swipeHandlers = useSwipeNavigation({
    onNext: goNext,
    onPrevious: goPrevious,
    isRTL: true,
    threshold: 50,
  });

  // Keyboard navigation (RTL-aware)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // In RTL: ArrowRight goes to previous, ArrowLeft goes to next
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goPrevious();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goNext();
    }
  }, [goNext, goPrevious]);

  // Calculate transform for RTL (positive values move content right)
  const translateX = currentIndex * (100 / itemsPerView);

  return (
    <div className={`relative ${className}`}>
      {/* Main container with overflow hidden */}
      <div 
        ref={containerRef}
        className="overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a227] focus-visible:ring-offset-2 rounded-lg"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="region"
        aria-label="محتوى قابل للتمرير"
        {...swipeHandlers}
      >
        <div 
          className="flex transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(${translateX}%)`,
            gap: `${gap}px`,
          }}
        >
          {children.map((child, index) => (
            <div
              key={index}
              className="flex-shrink-0"
              style={{
                width: `calc((100% - ${(itemsPerView - 1) * gap}px) / ${itemsPerView})`,
              }}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows - hidden on touch devices */}
      {showArrows && totalItems > itemsPerView && (
        <>
          {/* Previous button (right side in RTL) */}
          <button
            onClick={goPrevious}
            disabled={currentIndex === 0}
            className="hidden md:flex absolute top-1/2 -translate-y-1/2 -right-4 touch-icon-btn bg-white shadow-lg rounded-full text-stone-600 hover:text-stone-900 disabled:opacity-30 disabled:cursor-not-allowed z-10"
            aria-label="السابق"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Next button (left side in RTL) */}
          <button
            onClick={goNext}
            disabled={currentIndex >= maxIndex}
            className="hidden md:flex absolute top-1/2 -translate-y-1/2 -left-4 touch-icon-btn bg-white shadow-lg rounded-full text-stone-600 hover:text-stone-900 disabled:opacity-30 disabled:cursor-not-allowed z-10"
            aria-label="التالي"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </>
      )}

      {/* Pagination dots */}
      {showDots && totalItems > itemsPerView && (
        <div className="flex justify-center gap-2 mt-4" role="tablist" aria-label="تصفح العناصر">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? 'bg-[#1a3a2f] w-6'
                  : 'bg-stone-300 hover:bg-stone-400'
              }`}
              role="tab"
              aria-selected={index === currentIndex}
              aria-label={`الانتقال إلى المجموعة ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Swipe hint for mobile (only shows on first visit) */}
      <SwipeHint show={totalItems > itemsPerView} />
    </div>
  );
}

/**
 * Visual hint showing users they can swipe
 * Only shows once per session
 */
function SwipeHint({ show }: { show: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    // Check if already shown this session
    if (typeof window !== 'undefined') {
      const shown = sessionStorage.getItem('swipe-hint-shown');
      if (shown) {
        setHasShown(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!show || dismissed || hasShown) return;
    
    // Auto-dismiss after 3 seconds
    const timer = setTimeout(() => {
      setDismissed(true);
      sessionStorage.setItem('swipe-hint-shown', 'true');
    }, 3000);

    return () => clearTimeout(timer);
  }, [show, dismissed, hasShown]);

  if (!show || dismissed || hasShown) return null;

  return (
    <div 
      className="md:hidden absolute inset-x-0 bottom-0 flex items-center justify-center py-2 text-xs text-stone-500 animate-pulse pointer-events-none"
      aria-hidden="true"
    >
      <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
      اسحب للتصفح
    </div>
  );
}
