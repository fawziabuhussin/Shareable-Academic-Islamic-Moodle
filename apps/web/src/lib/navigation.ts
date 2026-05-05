/**
 * Centralized Navigation Utility
 * 
 * This module provides consistent navigation throughout the app,
 * avoiding full page reloads that cause visual flash.
 * 
 * Best Practices:
 * - Use soft navigation (router.push) by default for smooth transitions
 * - Only use hard navigation (window.location) for auth state changes that require full reload
 * - Prefetch common routes for instant navigation
 */

import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

// Singleton router instance for use outside React components
let routerInstance: AppRouterInstance | null = null;

/**
 * Set the router instance (call this from a top-level component)
 */
export function setRouter(router: AppRouterInstance) {
  routerInstance = router;
}

/**
 * Get the current router instance
 */
export function getRouter(): AppRouterInstance | null {
  return routerInstance;
}

/**
 * Soft navigation - uses Next.js router for smooth client-side transition
 * No flash, maintains app state
 */
export function navigateTo(path: string, router?: AppRouterInstance) {
  const r = router || routerInstance;
  if (r) {
    r.push(path);
  } else {
    // Fallback if router not available (shouldn't happen in normal use)
    console.warn('[Navigation] Router not available, using soft fallback');
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

/**
 * Soft replace - replaces current history entry without adding to stack
 */
export function replaceTo(path: string, router?: AppRouterInstance) {
  const r = router || routerInstance;
  if (r) {
    r.replace(path);
  } else {
    window.history.replaceState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

/**
 * Hard navigation - forces full page reload
 * Use ONLY when absolutely necessary:
 * - After login (to initialize fresh auth state)
 * - After logout (to clear all cached data)
 * - When switching between major app sections with different layouts
 */
export function hardNavigateTo(path: string) {
  // Use replace to avoid back-button issues
  window.location.replace(path);
}

/**
 * Redirect to login page
 * Uses soft navigation to avoid flash
 */
export function redirectToLogin(router?: AppRouterInstance, returnUrl?: string) {
  const path = returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/login';
  navigateTo(path, router);
}

/**
 * Handle successful login - determines redirect path based on role
 * Uses hard navigation because we need to initialize fresh auth state
 */
export function handleLoginRedirect(userRole: string) {
  let redirectPath = '/dashboard';
  const role = userRole?.toUpperCase();
  
  if (role === 'ADMIN') {
    redirectPath = '/admin';
  } else if (role === 'TEACHER') {
    redirectPath = '/teacher';
  }
  
  // Use hard navigation for login to ensure fresh state
  hardNavigateTo(redirectPath);
}

/**
 * Broadcast auth logout event so all mounted components can clear user state.
 * Call this whenever auth is invalidated (401 interceptor, manual logout, etc.)
 */
export function broadcastLogout() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }
}

/**
 * Handle logout - clears auth and redirects
 */
export function handleLogout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    broadcastLogout();
  }
  // Use hard navigation to clear all cached state
  hardNavigateTo('/');
}

/**
 * Prefetch a route for faster navigation
 */
export function prefetchRoute(path: string, router?: AppRouterInstance) {
  const r = router || routerInstance;
  if (r) {
    r.prefetch(path);
  }
}

/**
 * Prefetch common routes based on user role
 */
export function prefetchCommonRoutes(userRole: string, router?: AppRouterInstance) {
  const role = userRole?.toUpperCase();
  const r = router || routerInstance;
  
  if (!r) return;
  
  // Common routes for all authenticated users
  const commonRoutes = ['/dashboard', '/courses'];
  
  // Role-specific routes
  const roleRoutes: Record<string, string[]> = {
    STUDENT: ['/dashboard/exams', '/dashboard/grades', '/dashboard/homework'],
    TEACHER: ['/teacher', '/teacher/courses', '/teacher/exams', '/teacher/grades'],
    ADMIN: ['/admin', '/admin/users', '/admin/courses'],
  };
  
  const routesToPrefetch = [...commonRoutes, ...(roleRoutes[role] || [])];
  
  routesToPrefetch.forEach(route => {
    r.prefetch(route);
  });
}
