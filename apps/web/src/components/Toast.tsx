'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

// Toast Provider Component
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'info', duration: number = 4000) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, newToast]);

    // Auto remove after duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    // Make showToast available globally
    (window as any).showToast = showToast;
  }, []);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-6 h-6" />;
      case 'error':
        return <XCircle className="w-6 h-6" />;
      case 'warning':
        return <AlertCircle className="w-6 h-6" />;
      default:
        return <Info className="w-6 h-6" />;
    }
  };

  const getColors = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          container: 'border-emerald-200/70 bg-white/90 text-emerald-900',
          glow: 'from-emerald-400/20 via-emerald-400/10 to-transparent',
          iconBg: 'bg-emerald-100 text-emerald-700',
          accent: 'from-emerald-400 via-teal-400 to-sky-400',
        };
      case 'error':
        return {
          container: 'border-rose-200/70 bg-white/90 text-rose-900',
          glow: 'from-rose-400/20 via-rose-400/10 to-transparent',
          iconBg: 'bg-rose-100 text-rose-700',
          accent: 'from-rose-400 via-orange-400 to-amber-400',
        };
      case 'warning':
        return {
          container: 'border-amber-200/70 bg-white/90 text-amber-900',
          glow: 'from-amber-400/20 via-amber-400/10 to-transparent',
          iconBg: 'bg-amber-100 text-amber-700',
          accent: 'from-amber-400 via-orange-400 to-rose-400',
        };
      default:
        return {
          container: 'border-sky-200/70 bg-white/90 text-sky-900',
          glow: 'from-sky-400/20 via-sky-400/10 to-transparent',
          iconBg: 'bg-sky-100 text-sky-700',
          accent: 'from-sky-400 via-indigo-400 to-violet-400',
        };
    }
  };

  return (
    <>
      {children}
      <div
        className="fixed top-4 left-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none"
        style={{ direction: 'rtl' }}
      >
        {toasts.map((toast) => {
          const colors = getColors(toast.type);
          return (
            <div
              key={toast.id}
              className={`relative overflow-hidden border rounded-2xl shadow-[0_18px_40px_-24px_rgba(15,23,42,0.7)] p-4 pr-3 flex items-center gap-4 min-w-[300px] max-w-md pointer-events-auto backdrop-blur-xl animate-in slide-in-from-top-2 fade-in-0 duration-300 ${colors.container}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-l ${colors.glow}`} />
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${colors.accent}`} />
              <div className={`relative flex-shrink-0 rounded-full p-2 ${colors.iconBg}`}>
                {getIcon(toast.type)}
              </div>
              <div className="relative flex-1 text-base font-semibold leading-relaxed">
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="relative flex-shrink-0 rounded-full border border-black/5 bg-white/80 p-1.5 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-800"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

// Hook to use toast
export function useToast() {
  const showToast = (message: string, type: ToastType = 'info', duration: number = 4000) => {
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast(message, type, duration);
    } else if (process.env.NODE_ENV === 'development') {
      console.warn('[toast]', message);
    }
  };

  return { showToast };
}

// Global function for easy access
export const toast = {
  success: (message: string, duration?: number) => {
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast(message, 'success', duration);
    } else if (process.env.NODE_ENV === 'development') {
      console.warn('[toast]', message);
    }
  },
  error: (message: string, duration?: number) => {
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast(message, 'error', duration);
    } else if (process.env.NODE_ENV === 'development') {
      console.warn('[toast:error]', message);
    }
  },
  info: (message: string, duration?: number) => {
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast(message, 'info', duration);
    } else if (process.env.NODE_ENV === 'development') {
      console.warn('[toast:info]', message);
    }
  },
  warning: (message: string, duration?: number) => {
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast(message, 'warning', duration);
    } else if (process.env.NODE_ENV === 'development') {
      console.warn('[toast:warning]', message);
    }
  },
};


