'use client';

import useSWR, { SWRConfiguration } from 'swr';
import api from '@/lib/api';

// Default SWR configuration for optimal caching
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false, // Don't refetch when window regains focus
  revalidateIfStale: true,  // Refetch if data is stale
  dedupingInterval: 5000,   // Dedupe requests within 5 seconds
  errorRetryCount: 2,       // Retry failed requests twice
};

// Generic fetcher function using our api instance
const fetcher = async (url: string) => {
  const response = await api.get(url);
  return response.data;
};

/**
 * Hook for fetching courses with caching
 */
export function useCourses(categoryId?: string, search?: string) {
  const params = new URLSearchParams();
  if (categoryId) params.append('categoryId', categoryId);
  if (search) params.append('search', search);
  const queryString = params.toString();
  const url = `/courses${queryString ? `?${queryString}` : ''}`;
  
  return useSWR(url, fetcher, {
    ...defaultConfig,
    revalidateOnMount: true,
  });
}

/**
 * Hook for fetching a single course
 */
export function useCourse(courseId: string) {
  return useSWR(
    courseId ? `/courses/${courseId}` : null,
    fetcher,
    defaultConfig
  );
}

/**
 * Hook for fetching categories
 */
export function useCategories() {
  return useSWR('/categories', fetcher, {
    ...defaultConfig,
    revalidateOnMount: true,
    dedupingInterval: 60000, // Cache categories for 1 minute
  });
}

/**
 * Hook for fetching user enrollments
 */
export function useEnrollments() {
  return useSWR('/enrollments/my-enrollments', fetcher, {
    ...defaultConfig,
    revalidateOnMount: true,
  });
}

/**
 * Hook for fetching grades with optional filtering
 */
export function useGrades(courseId?: string) {
  const url = courseId ? `/grades?courseId=${courseId}` : '/grades';
  return useSWR(url, fetcher, defaultConfig);
}

/**
 * Hook for fetching exams for a course
 */
export function useExams(courseId: string) {
  return useSWR(
    courseId ? `/exams/course/${courseId}` : null,
    fetcher,
    defaultConfig
  );
}

/**
 * Hook for fetching homework for a course
 */
export function useHomework(courseId: string) {
  return useSWR(
    courseId ? `/homework/course/${courseId}` : null,
    fetcher,
    defaultConfig
  );
}

/**
 * Hook for fetching current user
 */
export function useCurrentUser() {
  return useSWR('/auth/me', fetcher, {
    ...defaultConfig,
    revalidateOnMount: true,
    errorRetryCount: 0, // Don't retry auth requests
  });
}

/**
 * Hook for parallel fetching of multiple resources
 * Reduces waterfall requests
 */
export function useParallelFetch<T extends Record<string, string>>(urls: T) {
  const entries = Object.entries(urls);
  const keys = Object.keys(urls);
  
  // Create individual SWR hooks for each URL
  const results = entries.map(([key, url]) => 
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSWR(url, fetcher, defaultConfig)
  );
  
  // Combine results into a single object
  const data: Partial<Record<keyof T, any>> = {};
  const errors: Partial<Record<keyof T, any>> = {};
  let isLoading = false;
  
  results.forEach((result, index) => {
    const key = keys[index];
    data[key as keyof T] = result.data;
    errors[key as keyof T] = result.error;
    if (result.isLoading) isLoading = true;
  });
  
  return {
    data,
    errors,
    isLoading,
    isValidating: results.some(r => r.isValidating),
  };
}
