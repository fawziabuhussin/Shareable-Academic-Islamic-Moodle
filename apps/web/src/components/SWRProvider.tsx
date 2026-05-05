'use client';

import { SWRConfig } from 'swr';
import api from '@/lib/api';

// Global fetcher for SWR
const fetcher = async (url: string) => {
  const response = await api.get(url);
  return response.data;
};

interface SWRProviderProps {
  children: React.ReactNode;
}

/**
 * SWRProvider - Global SWR configuration for smooth navigation
 * 
 * Key optimizations:
 * - keepPreviousData: Shows stale data while fetching, prevents flash
 * - revalidateOnFocus: Disabled to prevent unnecessary re-fetches
 * - dedupingInterval: Prevents duplicate requests
 * - revalidateIfStale: Shows cached data first, then revalidates in background
 */
export default function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        fetcher,
        keepPreviousData: true,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 5000,
        errorRetryCount: 2,
        // Use stale data immediately while revalidating
        revalidateIfStale: true,
        // Don't clear cache on error
        shouldRetryOnError: true,
        // Persist cache between navigations by using provider
        provider: () => new Map(),
      }}
    >
      {children}
    </SWRConfig>
  );
}
