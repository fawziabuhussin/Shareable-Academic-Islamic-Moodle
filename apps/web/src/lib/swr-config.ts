/**
 * SWR Configuration for Smooth Navigation
 * 
 * This module provides optimized SWR configurations that prevent
 * flash/jank during page transitions.
 */

import { SWRConfiguration } from 'swr';

/**
 * Default SWR config with optimizations for smooth navigation:
 * - keepPreviousData: Shows previous data while fetching, prevents skeleton flash
 * - revalidateOnFocus: Disabled to prevent unnecessary re-fetches
 * - dedupingInterval: Prevents duplicate requests within timeframe
 */
export const defaultSWRConfig: SWRConfiguration = {
  keepPreviousData: true, // KEY: Prevents flash by showing old data during fetch
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000, // 5 seconds
  errorRetryCount: 2,
};

/**
 * Config for data that changes rarely (categories, user profile)
 */
export const staticDataConfig: SWRConfiguration = {
  ...defaultSWRConfig,
  dedupingInterval: 60000, // 1 minute
  revalidateOnMount: false, // Don't revalidate if cache exists
};

/**
 * Config for data that needs to stay fresh (notifications, counts)
 */
export const realtimeDataConfig: SWRConfiguration = {
  ...defaultSWRConfig,
  dedupingInterval: 1000,
  refreshInterval: 30000, // Refresh every 30 seconds
};

/**
 * Config for paginated data
 */
export const paginatedDataConfig: SWRConfiguration = {
  ...defaultSWRConfig,
  dedupingInterval: 3000,
};

/**
 * Helper to determine if we should show skeleton
 * Only shows skeleton on truly fresh loads, not navigation between cached pages
 */
export function shouldShowSkeleton(isLoading: boolean, data: unknown): boolean {
  // If we have data (even stale), don't show skeleton
  if (data !== undefined) return false;
  // Only show skeleton if loading AND no data at all
  return isLoading;
}
