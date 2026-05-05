'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { setRouter, prefetchCommonRoutes } from '@/lib/navigation';

interface NavigationProviderProps {
  children: React.ReactNode;
}

/**
 * NavigationProvider - Sets up global navigation utilities
 * 
 * This component:
 * 1. Registers the router instance for use outside React components
 * 2. Prefetches common routes based on user role
 * 3. Handles route change events for analytics/tracking
 */
export default function NavigationProvider({ children }: NavigationProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Register router instance on mount
  useEffect(() => {
    setRouter(router);
  }, [router]);

  // Check profile completion and redirect if needed
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userStr = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');

    // Only check if user is logged in
    if (userStr && accessToken) {
      try {
        const user = JSON.parse(userStr);

        // If profile is incomplete and not already on complete-profile page
        if (user && !user.profileComplete && pathname !== '/complete-profile') {
          router.push('/complete-profile');
          return;
        }

        // Prefetch common routes
        if (user?.role) {
          prefetchCommonRoutes(user.role, router);
        }
      } catch {
        // Invalid user data, ignore
      }
    }
  }, [router, pathname]);

  return <>{children}</>;
}
