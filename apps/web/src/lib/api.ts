import axios from 'axios';
import {
  LEGACY_VERCEL_API_ORIGIN,
  PRODUCTION_API_ORIGIN,
  PRODUCTION_FRONTEND_HOSTNAMES,
  TYPO_FRONTEND_HOSTNAMES,
} from '@/lib/siteUrls';

// Determine API URL: prioritize env var, then runtime detection
const getApiUrl = (): string => {
  // 1. Check build-time env var (set in Vercel / hosting)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 2. Runtime detection for browser (client-side)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const prodHosts = [...PRODUCTION_FRONTEND_HOSTNAMES, ...TYPO_FRONTEND_HOSTNAMES];
    const onProdFrontend = prodHosts.some(
      (h) => hostname === h || hostname.endsWith(`.${h}`)
    );
    if (onProdFrontend) {
      return PRODUCTION_API_ORIGIN;
    }
    // Legacy Vercel preview / old production hosts
    if (hostname.includes('vercel.app') || hostname.includes('example')) {
      return LEGACY_VERCEL_API_ORIGIN;
    }
    return 'http://localhost:3001';
  }

  // 3. Server-side rendering (SSR)
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return PRODUCTION_API_ORIGIN;
  }

  return 'http://localhost:3001';
};

const API_URL = getApiUrl();

// Log API URL only in development mode
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[API] Using API URL:', API_URL);
}

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = (originalRequest?.url || '').toLowerCase();

    // Skip token refresh for auth endpoints (login, register, etc.)
    // Check multiple patterns to handle different URL formats
    const isAuthEndpoint = requestUrl.includes('auth/login') ||
                           requestUrl.includes('auth/register') ||
                           requestUrl.includes('auth/google') ||
                           requestUrl.includes('auth/apple') ||
                           requestUrl.includes('auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          `${API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        if (typeof window !== 'undefined') {
          // Broadcast logout event so all mounted components clear user state
          // Then redirect to login
          import('@/lib/navigation').then(({ broadcastLogout, redirectToLogin }) => {
            broadcastLogout();
            redirectToLogin();
          });
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

