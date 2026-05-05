'use client';

import { useEffect, useState } from 'react';
import { showInfo, showWarning, TOAST_MESSAGES } from '@/lib/toast';
import { WifiIcon, WifiOffIcon } from '@/components/Icons';

/**
 * OfflineIndicator Component
 * 
 * Monitors network connectivity and displays:
 * - A persistent banner when offline
 * - Toast notifications on connectivity changes
 */
export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Set initial state from navigator
    setIsOnline(navigator.onLine);
    setHasInitialized(true);

    const handleOnline = () => {
      setIsOnline(true);
      showInfo(TOAST_MESSAGES.ONLINE);
    };

    const handleOffline = () => {
      setIsOnline(false);
      showWarning(TOAST_MESSAGES.OFFLINE);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't render anything until we've checked the initial state
  if (!hasInitialized) return null;

  // Only show banner when offline
  if (isOnline) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 bg-amber-500 text-white py-3 px-4 shadow-lg animate-slide-up"
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
        <WifiOffIcon size={20} className="flex-shrink-0" />
        <span className="font-medium text-sm sm:text-base">
          {TOAST_MESSAGES.OFFLINE} - بعض الميزات قد لا تعمل بشكل صحيح
        </span>
      </div>
    </div>
  );
}
