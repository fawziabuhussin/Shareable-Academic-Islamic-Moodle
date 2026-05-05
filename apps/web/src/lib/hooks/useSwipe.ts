'use client';

import { useRef, useCallback, useEffect } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipe?: (direction: SwipeDirection) => void;
}

export interface SwipeConfig {
  /** Minimum distance (px) to trigger a swipe. Default: 50 */
  threshold?: number;
  /** Maximum allowed perpendicular distance. Default: 100 */
  maxPerpendicularDistance?: number;
  /** Minimum velocity (px/ms) to trigger a swipe. Default: 0.3 */
  minVelocity?: number;
  /** Prevent default touch behavior. Default: false */
  preventDefault?: boolean;
}

interface TouchData {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
}

/**
 * Custom hook for detecting swipe gestures on touch devices
 * 
 * @example
 * ```tsx
 * const swipeHandlers = useSwipe({
 *   onSwipeLeft: () => goToNext(),
 *   onSwipeRight: () => goToPrevious(),
 * });
 * 
 * return <div {...swipeHandlers}>Swipeable content</div>;
 * ```
 */
export function useSwipe(
  handlers: SwipeHandlers,
  config: SwipeConfig = {}
) {
  const {
    threshold = 50,
    maxPerpendicularDistance = 100,
    minVelocity = 0.3,
    preventDefault = false,
  } = config;

  const touchDataRef = useRef<TouchData | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchDataRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      currentX: touch.clientX,
      currentY: touch.clientY,
    };
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchDataRef.current) return;
    
    const touch = e.touches[0];
    touchDataRef.current.currentX = touch.clientX;
    touchDataRef.current.currentY = touch.clientY;

    if (preventDefault) {
      e.preventDefault();
    }
  }, [preventDefault]);

  const handleTouchEnd = useCallback(() => {
    if (!touchDataRef.current) return;

    const { startX, startY, startTime, currentX, currentY } = touchDataRef.current;
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;
    const deltaTime = Date.now() - startTime;
    
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    // Calculate velocity
    const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime;

    // Determine if it's a horizontal or vertical swipe
    const isHorizontal = absX > absY;
    const primaryDistance = isHorizontal ? absX : absY;
    const perpendicularDistance = isHorizontal ? absY : absX;

    // Check if swipe meets criteria
    const meetsThreshold = primaryDistance >= threshold;
    const withinPerpendicularLimit = perpendicularDistance <= maxPerpendicularDistance;
    const meetsVelocity = velocity >= minVelocity;

    if (meetsThreshold && withinPerpendicularLimit && meetsVelocity) {
      let direction: SwipeDirection;
      
      if (isHorizontal) {
        // RTL-aware: In RTL layouts, physical left swipe = "next" (conceptually right)
        // We return the physical direction, let the consumer handle RTL logic
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      // Call specific handler
      switch (direction) {
        case 'left':
          handlers.onSwipeLeft?.();
          break;
        case 'right':
          handlers.onSwipeRight?.();
          break;
        case 'up':
          handlers.onSwipeUp?.();
          break;
        case 'down':
          handlers.onSwipeDown?.();
          break;
      }

      // Call generic handler
      handlers.onSwipe?.(direction);
    }

    touchDataRef.current = null;
  }, [handlers, threshold, maxPerpendicularDistance, minVelocity]);

  // Return props to spread on the element
  const bind = useCallback(() => ({
    onTouchStart: (e: React.TouchEvent) => handleTouchStart(e.nativeEvent),
    onTouchMove: (e: React.TouchEvent) => handleTouchMove(e.nativeEvent),
    onTouchEnd: () => handleTouchEnd(),
  }), [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return bind();
}

/**
 * Hook for swipe navigation between pages/items
 * Handles RTL layout automatically
 * 
 * @example
 * ```tsx
 * const swipeNav = useSwipeNavigation({
 *   onNext: () => setPage(p => p + 1),
 *   onPrevious: () => setPage(p => p - 1),
 *   isRTL: true,
 * });
 * 
 * return <div {...swipeNav}>Navigable content</div>;
 * ```
 */
export function useSwipeNavigation(options: {
  onNext?: () => void;
  onPrevious?: () => void;
  isRTL?: boolean;
  threshold?: number;
}) {
  const { onNext, onPrevious, isRTL = true, threshold = 50 } = options;

  return useSwipe({
    onSwipeLeft: () => {
      // In RTL, swipe left = go to previous (visually)
      // In LTR, swipe left = go to next
      if (isRTL) {
        onPrevious?.();
      } else {
        onNext?.();
      }
    },
    onSwipeRight: () => {
      // In RTL, swipe right = go to next (visually)
      // In LTR, swipe right = go to previous
      if (isRTL) {
        onNext?.();
      } else {
        onPrevious?.();
      }
    },
  }, { threshold });
}

/**
 * Hook for swipe-to-dismiss functionality
 * 
 * @example
 * ```tsx
 * const { swipeHandlers, translateY, isDismissing } = useSwipeToDismiss({
 *   onDismiss: () => setVisible(false),
 *   direction: 'down',
 * });
 * ```
 */
export function useSwipeToDismiss(options: {
  onDismiss: () => void;
  direction?: 'up' | 'down';
  threshold?: number;
}) {
  const { onDismiss, direction = 'down', threshold = 100 } = options;

  return useSwipe({
    onSwipeUp: direction === 'up' ? onDismiss : undefined,
    onSwipeDown: direction === 'down' ? onDismiss : undefined,
  }, { threshold, maxPerpendicularDistance: 50 });
}

export default useSwipe;
