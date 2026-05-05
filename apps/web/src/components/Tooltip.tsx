'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface TooltipProps {
  /** The text to display in the tooltip */
  text: string;
  /** The element that triggers the tooltip */
  children: React.ReactNode;
  /** Position of the tooltip relative to the trigger */
  position?: 'top' | 'bottom';
  /** Max width of the tooltip (default 240px) */
  maxWidth?: number;
}

/**
 * Tooltip component – shows a styled floating tooltip on hover/focus.
 * Supports RTL, auto-repositions if clipped by viewport edges.
 *
 * Usage:
 *   <Tooltip text="Some helpful text">
 *     <button>Hover me</button>
 *   </Tooltip>
 */
export default function Tooltip({ text, children, position = 'bottom', maxWidth = 240 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(true), 200);
  }, []);

  const hide = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(false), 100);
  }, []);

  // Position the tooltip after it becomes visible
  useEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) {
      setCoords(null);
      return;
    }

    const trigger = triggerRef.current.getBoundingClientRect();
    const tip = tooltipRef.current.getBoundingClientRect();
    const padding = 8; // viewport edge padding

    // Horizontal: center on trigger, clamp to viewport
    let left = trigger.left + trigger.width / 2 - tip.width / 2;
    left = Math.max(padding, Math.min(left, window.innerWidth - tip.width - padding));

    // Vertical
    let top: number;
    if (position === 'top') {
      top = trigger.top - tip.height - 6;
      // Flip to bottom if clipped
      if (top < padding) top = trigger.bottom + 6;
    } else {
      top = trigger.bottom + 6;
      // Flip to top if clipped
      if (top + tip.height > window.innerHeight - padding) top = trigger.top - tip.height - 6;
    }

    setCoords({ top, left });
  }, [visible, position]);

  // Cleanup timeout on unmount
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        tabIndex={0}
        className="inline-flex cursor-help"
        aria-describedby={visible ? 'tooltip' : undefined}
      >
        {children}
      </span>

      {visible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          id="tooltip"
          style={{
            position: 'fixed',
            top: coords?.top ?? -9999,
            left: coords?.left ?? -9999,
            maxWidth,
            zIndex: 9999,
            opacity: coords ? 1 : 0,
          }}
          className="px-3 py-2 text-xs leading-relaxed font-medium text-white bg-stone-800 rounded-lg shadow-lg pointer-events-none transition-opacity duration-150"
        >
          {text}
        </div>
      )}
    </>
  );
}
