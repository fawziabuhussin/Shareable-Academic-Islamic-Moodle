'use client';

import { ReactNode } from 'react';

/**
 * Skip Link Component
 * Allows keyboard users to skip navigation and go directly to main content
 */
interface SkipLinkProps {
  targetId: string;
  children?: ReactNode;
}

export function SkipLink({ targetId, children = 'تخطي إلى المحتوى الرئيسي' }: SkipLinkProps) {
  return (
    <a 
      href={`#${targetId}`} 
      className="skip-link"
      onClick={(e) => {
        e.preventDefault();
        const target = document.getElementById(targetId);
        if (target) {
          target.focus();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }}
    >
      {children}
    </a>
  );
}

/**
 * Visually Hidden Component
 * Content visible only to screen readers
 */
interface VisuallyHiddenProps {
  children: ReactNode;
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function VisuallyHidden({ children, as: Component = 'span' }: VisuallyHiddenProps) {
  return <Component className="sr-only">{children}</Component>;
}

/**
 * Live Region Component
 * Announces dynamic content changes to screen readers
 * Hidden visually but read by screen readers
 */
interface LiveRegionProps {
  children: ReactNode;
  politeness?: 'polite' | 'assertive';
  className?: string;
}

export function LiveRegion({ 
  children, 
  politeness = 'polite',
  className = ''
}: LiveRegionProps) {
  return (
    <div 
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className={`sr-only ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Accessible Icon Button Component
 * Ensures icon-only buttons have proper labels
 */
interface IconButtonProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function IconButton({ 
  icon, 
  label, 
  onClick, 
  disabled = false, 
  className = '',
  type = 'button'
}: IconButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`touch-target inline-flex items-center justify-center ${className}`}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
