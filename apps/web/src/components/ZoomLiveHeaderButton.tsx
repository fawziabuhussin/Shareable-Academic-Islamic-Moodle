'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import Modal from '@/components/Modal';

type PublicStatus = {
  showButton: boolean;
  isLive: boolean;
  buttonLabelAr: string;
  nextSessionMessageAr: string | null;
  scheduleSummaryAr: string | null;
  zoomUrl: string | null;
};

const fetcher = (path: string) => api.get(path).then((r) => r.data as PublicStatus);

export type ZoomLiveHeaderProminence = 'default' | 'centerpiece' | 'mobile';

interface ZoomLiveHeaderButtonProps {
  className?: string;
  /** default: legacy inline; centerpiece: desktop focal pill; mobile: full-width row under auth */
  prominence?: ZoomLiveHeaderProminence;
  /** Match public header bar (contrast on light vs dark surfaces) */
  surface?: 'brand' | 'light';
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function ZoomLiveHeaderButton({
  className = '',
  prominence = 'default',
  surface = 'brand',
}: ZoomLiveHeaderButtonProps) {
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [playShake, setPlayShake] = useState(false);

  const { data, error, isLoading } = useSWR('/zoom-live/public-status', fetcher, {
    refreshInterval: 45_000,
    revalidateOnFocus: true,
    dedupingInterval: 10_000,
  });

  const openOfflineModal = useCallback(() => {
    setOfflineOpen(true);
  }, []);

  const handleShakeAnimationEnd = useCallback(
    (e: React.AnimationEvent<HTMLButtonElement>) => {
      if (e.target !== e.currentTarget) return;
      if (!/zoom-live-press-shake/.test(e.animationName)) return;
      setPlayShake(false);
      openOfflineModal();
    },
    [openOfflineModal]
  );

  if (isLoading && !data) {
    return null;
  }

  if (error || !data?.showButton) {
    return null;
  }

  const isLive = Boolean(data.isLive && data.zoomUrl);
  const label = data.buttonLabelAr?.trim() || 'الدخول إلى البث المباشر';

  const handleActivate = () => {
    if (isLive && data.zoomUrl) {
      window.open(data.zoomUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (prefersReducedMotion()) {
      openOfflineModal();
      return;
    }
    setPlayShake(true);
  };

  const scheduleLine = data.scheduleSummaryAr?.trim() || null;
  const extraNote = data.nextSessionMessageAr?.trim() || null;

  const videoIcon = (
    <svg
      className="size-4 shrink-0 opacity-90 md:size-[0.95rem]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );

  const prominenceClasses =
    prominence === 'centerpiece'
      ? [
          'rounded-full min-h-[44px] max-w-[min(17.5rem,78vw)] px-5 py-2.5 text-sm shadow-[0_10px_40px_-12px_rgba(0,0,0,0.55)] ring-2 transition-all duration-300',
          'hover:-translate-y-px',
          isLive
            ? 'zoom-live-btn--active border-red-400/50 bg-gradient-to-b from-red-500 to-red-700 text-white ring-red-400/35 hover:from-red-500 hover:to-red-600'
            : 'border border-[#c9a227]/40 bg-gradient-to-b from-white/[0.14] to-white/[0.06] text-white ring-[#c9a227]/25 hover:border-[#c9a227]/55 hover:from-white/[0.18] hover:to-white/[0.08]',
        ].join(' ')
      : prominence === 'mobile'
        ? [
            'w-full max-w-md rounded-2xl min-h-[52px] px-4 py-3 text-sm shadow-[0_12px_36px_-14px_rgba(0,0,0,0.5)] ring-1 transition-all duration-200',
            'active:scale-[0.99]',
            isLive
              ? 'zoom-live-btn--active border-red-400/40 bg-gradient-to-b from-red-600 to-red-800 text-white ring-red-500/30'
              : 'border border-white/20 bg-gradient-to-b from-white/[0.16] to-white/[0.07] text-white ring-white/10 hover:border-[#c9a227]/40',
          ].join(' ')
        : surface === 'light'
          ? [
              'rounded-xl md:rounded-lg min-h-[52px] w-full md:min-h-0 md:w-auto md:shrink-0',
              'px-4 py-3.5 text-base md:px-3 md:py-1.5 md:text-sm',
              'active:scale-[0.98] md:active:scale-100',
              isLive
                ? 'zoom-live-btn--active bg-red-600 text-white border-red-500 hover:bg-red-500 shadow-md md:shadow-md'
                : 'border border-[#1a3a2f]/25 bg-[#1a3a2f]/10 text-[#143028] shadow-sm hover:border-[#1a3a2f]/40 hover:bg-[#1a3a2f]/16 md:shadow-none',
            ].join(' ')
          : [
              'rounded-xl md:rounded-lg min-h-[52px] w-full md:min-h-0 md:w-auto md:shrink-0',
              'px-4 py-3.5 text-base md:px-3 md:py-1.5 md:text-sm',
              'active:scale-[0.98] md:active:scale-100',
              isLive
                ? 'zoom-live-btn--active bg-red-600 text-white border-red-500 hover:bg-red-500 shadow-lg md:shadow-none'
                : 'bg-white/12 text-white border-white/25 hover:bg-white/18 shadow-md md:shadow-none',
            ].join(' ');

  return (
    <>
      <button
        type="button"
        dir="rtl"
        onClick={handleActivate}
        onAnimationEnd={handleShakeAnimationEnd}
        className={[
          'relative z-0 inline-flex items-center justify-center gap-2 font-semibold border touch-manipulation select-none transition-colors',
          prominenceClasses,
          playShake ? 'zoom-live-btn--shake-once' : '',
          className,
        ].join(' ')}
        aria-label={
          isLive
            ? `${label} — بث مباشر متاح، افتح الرابط`
            : `${label} — البث غير متاح حالياً، اضغط لمعرفة أوقات البث`
        }
        aria-live="polite"
      >
        {isLive && (
          <span
            className={`flex shrink-0 items-center gap-1.5 rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-bold ${
              prominence === 'centerpiece' ? 'ring-1 ring-white/30' : ''
            }`}
            aria-hidden
          >
            <span className="inline-block size-2 animate-pulse rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
            مباشر
          </span>
        )}
        <span
          className={`truncate tracking-tight ${
            prominence === 'centerpiece'
              ? 'max-w-[11rem] text-center text-sm font-bold sm:max-w-[13rem]'
              : prominence === 'mobile'
                ? 'flex-1 text-center text-sm font-bold'
                : 'text-center font-bold md:max-w-[14rem] md:text-right md:font-semibold'
          }`}
        >
          {label}
        </span>
        {(prominence === 'centerpiece' || prominence === 'mobile') && !isLive && videoIcon}
        {(prominence === 'centerpiece' || prominence === 'mobile') && isLive && videoIcon}
        {prominence === 'default' && !isLive && (
          <svg
            className={`hidden w-3.5 shrink-0 md:block ${surface === 'light' ? 'opacity-70' : 'opacity-80'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
      </button>

      <Modal isOpen={offlineOpen} onClose={() => setOfflineOpen(false)} title="البث المباشر" size="md">
        <div className="p-6 pt-2 space-y-4 text-slate-700 leading-relaxed text-right">
          <div className="space-y-2">
            <p className="text-lg font-bold text-[#1a3a2f]">البث المباشر غير متاح الآن</p>
            <p className="text-stone-600">يرجى الدخول خلال أوقات البث المحددة.</p>
          </div>
          {scheduleLine && (
            <div className="rounded-xl border border-[#c9a227]/35 bg-amber-50/80 px-4 py-3 text-stone-800 text-sm leading-relaxed">
              {scheduleLine}
            </div>
          )}
          {extraNote && <p className="text-sm text-stone-600 whitespace-pre-wrap">{extraNote}</p>}
          <div className="flex flex-wrap gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => setOfflineOpen(false)}
              className="px-4 py-2.5 min-h-[44px] rounded-lg bg-stone-200 text-stone-800 text-sm font-medium hover:bg-stone-300"
            >
              إغلاق
            </button>
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] rounded-lg bg-[#1a3a2f] text-white text-sm font-medium hover:bg-[#143028]"
            >
              تواصل معنا
            </a>
          </div>
        </div>
      </Modal>
    </>
  );
}
