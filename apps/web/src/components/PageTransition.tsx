'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * PageTransition - Smooth transition wrapper for page content
 * 
 * Uses CSS opacity transition instead of animation to prevent
 * the "flash" effect during navigation. The transition is subtle
 * and only triggers when pathname changes.
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [displayChildren, setDisplayChildren] = useState(children);

  useEffect(() => {
    // When pathname changes, briefly fade out then update content
    setIsVisible(false);
    
    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setIsVisible(true);
    }, 50); // Very short delay - just enough to trigger transition

    return () => clearTimeout(timer);
  }, [pathname, children]);

  return (
    <div
      className="transition-opacity duration-150 ease-out"
      style={{ opacity: isVisible ? 1 : 0.95 }}
    >
      {displayChildren}
    </div>
  );
}
