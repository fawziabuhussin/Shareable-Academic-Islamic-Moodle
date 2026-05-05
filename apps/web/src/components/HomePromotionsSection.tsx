'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { toDirectImageUrl } from '@/lib/utils';
import { StarIcon, ArrowRightIcon } from '@/components/Icons';

export interface HomePromotion {
  id: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  linkUrlMale: string | null;
  linkLabelMale: string | null;
  linkUrlFemale: string | null;
  linkLabelFemale: string | null;
  zoomUrl: string | null;
  youtubeUrl: string | null;
}

function ZoomLogoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={22} height={22} aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="3" fill="currentColor" />
      <path
        fill="#fff"
        d="M9.5 8.5v7L15 12l-5.5-3.5z"
      />
    </svg>
  );
}

function YoutubeLogoIcon({ className }: { className?: string }) {
  /* Stylized mark: white play on parent’s red button; tube outline for recognition */
  return (
    <svg className={className} viewBox="0 0 24 24" width={22} height={22} aria-hidden>
      <path
        fill="rgba(255,255,255,0.95)"
        d="M21.6 7.2c-.2-.9-1-1.5-1.9-1.7C18 5 12 5 12 5s-6 0-7.7.5c-.9.2-1.7.8-1.9 1.7C2 9.1 2 12 2 12s0 2.9.4 4.8c.2.9 1 1.5 1.9 1.7 1.7.5 7.7.5 7.7.5s6 0 7.7-.5c.9-.2 1.7-.8 1.9-1.7.4-1.9.4-4.8.4-4.8s0-2.9-.4-4.8z"
      />
      <path fill="#FF0033" d="M10 9.5v5l4.5-2.5L10 9.5z" />
    </svg>
  );
}

type CtaResolution = { kind: 'single'; href: string; label: string } | { kind: 'none' };

/** Normalize API / DB gender for announcement routing (English + Arabic). */
export function normalizeUserGender(raw: string | null | undefined): 'MALE' | 'FEMALE' | null {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  const u = s.toUpperCase();
  if (u === 'MALE' || u === 'M') return 'MALE';
  if (u === 'FEMALE' || u === 'F') return 'FEMALE';
  const lower = s.toLowerCase();
  if (lower === 'male' || lower === 'man' || lower === 'boy') return 'MALE';
  if (lower === 'female' || lower === 'woman' || lower === 'girl') return 'FEMALE';
  // Arabic / UI labels sometimes stored or echoed
  if (s === 'ذكر' || s === 'أخوة' || s === 'اخوة') return 'MALE';
  if (s === 'أنثى' || s === 'انثى' || s === 'أخوات' || s === 'اخوات') return 'FEMALE';
  // Substring checks: test "female" before "male" (because "female".includes("male") is true)
  if (lower.includes('female') || u.includes('FEMALE')) return 'FEMALE';
  if (lower.includes('male') || u.includes('MALE')) return 'MALE';
  return null;
}

function readUserGenderFromStorage(): string | null | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const parsed = JSON.parse(localStorage.getItem('user') || '{}');
    return parsed?.gender ?? null;
  } catch {
    return null;
  }
}

/** Pick link/label from promotion using profile gender (MALE/FEMALE) and optional gender-specific URLs. */
export function resolvePromotionCtas(
  p: HomePromotion,
  userGenderRaw: string | null | undefined
): CtaResolution {
  const userGender = normalizeUserGender(userGenderRaw);
  const gen = (p.linkUrl ?? '').trim();
  const m = (p.linkUrlMale ?? '').trim();
  const f = (p.linkUrlFemale ?? '').trim();
  const defaultLabel = 'اعرف المزيد';

  if (userGender === 'MALE') {
    const href = (m || gen) || '';
    if (!href) return { kind: 'none' };
    const label =
      (m ? p.linkLabelMale : p.linkLabel)?.trim() ||
      p.linkLabel?.trim() ||
      defaultLabel;
    return { kind: 'single', href, label };
  }

  if (userGender === 'FEMALE') {
    const href = (f || gen) || '';
    if (!href) return { kind: 'none' };
    const label =
      (f ? p.linkLabelFemale : p.linkLabel)?.trim() ||
      p.linkLabel?.trim() ||
      defaultLabel;
    return { kind: 'single', href, label };
  }

  // Logged-in surfaces never show both gender links; without a known gender, use generic only or nothing
  if (m && f) {
    if (gen) {
      return {
        kind: 'single',
        href: gen,
        label: p.linkLabel?.trim() || defaultLabel,
      };
    }
    return { kind: 'none' };
  }

  if (m) {
    return {
      kind: 'single',
      href: m,
      label: p.linkLabelMale?.trim() || p.linkLabel?.trim() || defaultLabel,
    };
  }
  if (f) {
    return {
      kind: 'single',
      href: f,
      label: p.linkLabelFemale?.trim() || p.linkLabel?.trim() || defaultLabel,
    };
  }
  if (gen) {
    return {
      kind: 'single',
      href: gen,
      label: p.linkLabel?.trim() || defaultLabel,
    };
  }
  return { kind: 'none' };
}

function PromotionCard({
  p,
  compact,
  userGender,
}: {
  p: HomePromotion;
  compact?: boolean;
  userGender: string | null | undefined;
}) {
  const ctas = resolvePromotionCtas(p, userGender);
  const zoom = (p.zoomUrl ?? '').trim();
  const youtube = (p.youtubeUrl ?? '').trim();
  const hasExtras = !!(zoom || youtube);
  const hasMainLink = ctas.kind === 'single';

  const singleFooter =
    hasMainLink ? (
      <span
        className={`inline-flex items-center gap-1 font-bold text-[#c9a227] group-hover:text-[#b08f20] ${
          compact ? 'text-xs mt-2' : 'text-sm mt-4'
        }`}
      >
        {ctas.label}
        <ArrowRightIcon size={compact ? 14 : 16} className="rotate-180 transition group-hover:-translate-x-0.5" />
      </span>
    ) : null;

  const stretchedLink =
    ctas.kind === 'single' ? (
      ctas.href.startsWith('/') ? (
        <Link
          href={ctas.href}
          className="absolute inset-0 z-[1] rounded-[inherit]"
          aria-hidden
          tabIndex={-1}
        >
          <span className="sr-only">{ctas.label}</span>
        </Link>
      ) : (
        <a
          href={ctas.href}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 z-[1] rounded-[inherit]"
          aria-hidden
          tabIndex={-1}
        >
          <span className="sr-only">{ctas.label}</span>
        </a>
      )
    ) : null;

  const iconBtn =
    compact ? 'h-8 w-8 rounded-md' : 'h-9 w-9 rounded-lg';

  const extrasRow =
    hasExtras ? (
      <div className={`flex flex-row-reverse items-center gap-2 pointer-events-auto ${compact ? 'mt-2' : 'mt-3'}`}>
        {zoom ? (
          <a
            href={zoom}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex shrink-0 items-center justify-center ${iconBtn} bg-[#2D8CFF] text-white shadow-sm transition hover:bg-[#2171d0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D8CFF] focus-visible:ring-offset-2`}
            aria-label="Zoom"
            title="Zoom"
          >
            <ZoomLogoIcon />
          </a>
        ) : null}
        {youtube ? (
          <a
            href={youtube}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex shrink-0 items-center justify-center ${iconBtn} bg-[#FF0033] text-white shadow-sm transition hover:bg-[#d4002a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0033] focus-visible:ring-offset-2`}
            aria-label="YouTube"
            title="YouTube"
          >
            <YoutubeLogoIcon />
          </a>
        ) : null}
      </div>
    ) : null;

  const shellClass = `group relative border transition ${
    hasMainLink ? 'cursor-pointer' : ''
  } ${
    compact
      ? 'rounded-xl border-[#1a3a2f]/10 bg-white/95 p-3 shadow-sm hover:border-[#c9a227]/40'
      : 'rounded-2xl border-stone-200/80 bg-white p-5 shadow-sm hover:border-[#c9a227]/35 hover:shadow-md'
  }`;

  return (
    <article
      className={`${shellClass} ${hasMainLink ? 'focus-within:ring-2 focus-within:ring-[#c9a227] focus-within:ring-offset-2' : ''}`}
      dir="rtl"
    >
      {stretchedLink}
      <div className={`relative z-[2] flex min-w-0 flex-1 ${hasMainLink ? 'pointer-events-none' : ''} ${compact ? 'flex-row-reverse gap-3' : 'flex-col gap-5 sm:flex-row'}`}>
        {p.imageUrl ? (
          <div
            className={`relative shrink-0 overflow-hidden rounded-lg bg-stone-100 ${
              compact ? 'h-20 w-20' : 'h-40 w-full sm:h-32 sm:w-44'
            }`}
          >
            <Image
              src={toDirectImageUrl(p.imageUrl) || p.imageUrl}
              alt=""
              fill
              className="object-cover transition group-hover:scale-[1.02]"
              sizes={compact ? '80px' : '(max-width: 640px) 100vw, 176px'}
            />
          </div>
        ) : (
          <div
            className={`flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1a3a2f] to-[#2d5a4a] ${
              compact ? 'h-20 w-20' : 'h-28 w-full sm:h-32 sm:w-44'
            }`}
            aria-hidden
          >
            <StarIcon className="text-[#c9a227]/90" size={compact ? 28 : 40} />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col justify-center text-right">
          <h3 className={`font-bold text-[#1a3a2f] ${compact ? 'mb-1 text-sm' : 'mb-2 text-lg md:text-xl'}`}>
            {p.title}
          </h3>
          {p.body ? (
            <p
              className={`whitespace-pre-wrap leading-relaxed text-stone-600 ${
                compact ? 'line-clamp-2 text-xs' : 'line-clamp-4 text-sm md:text-base'
              }`}
            >
              {p.body}
            </p>
          ) : null}
          {singleFooter}
          {extrasRow}
        </div>
      </div>
    </article>
  );
}

type Variant = 'home' | 'dashboard' | 'marketing';

type Props = {
  variant?: Variant;
  /** From /auth/me — MALE / FEMALE / null for admins or incomplete profile */
  userGender: string | null | undefined;
};

export default function HomePromotionsSection({ variant = 'marketing', userGender }: Props) {
  const [items, setItems] = useState<HomePromotion[] | null>(null);
  const [genderOverride, setGenderOverride] = useState<string | null | undefined>(() => {
    if (normalizeUserGender(userGender) != null) return userGender;
    return readUserGenderFromStorage();
  });

  useEffect(() => {
    let cancelled = false;

    async function resolveGender() {
      if (normalizeUserGender(userGender) != null) {
        setGenderOverride(userGender);
        return;
      }
      const fromLs = readUserGenderFromStorage();
      if (normalizeUserGender(fromLs) != null) {
        setGenderOverride(fromLs);
        return;
      }
      if (typeof window !== 'undefined' && !localStorage.getItem('accessToken')) {
        setGenderOverride(null);
        return;
      }
      try {
        const res = await api.get<{ gender?: string | null }>('/auth/me');
        if (cancelled) return;
        const g = res.data?.gender ?? null;
        setGenderOverride(g);
        try {
          const raw = localStorage.getItem('user');
          const u = raw ? JSON.parse(raw) : {};
          localStorage.setItem('user', JSON.stringify({ ...u, gender: g }));
        } catch {
          /* ignore */
        }
      } catch {
        if (!cancelled) setGenderOverride(null);
      }
    }

    resolveGender();
    return () => {
      cancelled = true;
    };
  }, [userGender]);

  const resolvedGenderForCtas = useMemo(() => {
    if (normalizeUserGender(userGender) != null) return userGender;
    if (normalizeUserGender(genderOverride) != null) return genderOverride;
    return readUserGenderFromStorage();
  }, [userGender, genderOverride]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<HomePromotion[]>('/home-promotions/public')
      .then((res) => {
        if (!cancelled) {
          const raw = Array.isArray(res.data) ? res.data : [];
          setItems(
            raw.map((row: any) => ({
              ...row,
              linkUrlMale: row.linkUrlMale ?? null,
              linkLabelMale: row.linkLabelMale ?? null,
              linkUrlFemale: row.linkUrlFemale ?? null,
              linkLabelFemale: row.linkLabelFemale ?? null,
              zoomUrl: row.zoomUrl ?? null,
              youtubeUrl: row.youtubeUrl ?? null,
            }))
          );
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (items === null || items.length === 0) return null;

  if (variant === 'dashboard') {
    return (
      <section
        className="bg-gradient-to-b from-stone-100/90 to-stone-50 border-b border-stone-200/70"
        aria-labelledby="dashboard-promotions-heading"
        dir="rtl"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 text-[#c9a227] mb-4">
            <StarIcon size={20} />
            <h2 id="dashboard-promotions-heading" className="text-base font-bold text-[#1a3a2f]">
              إعلانات
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {items.map((p) => (
              <PromotionCard key={p.id} p={p} userGender={resolvedGenderForCtas} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'home') {
    return (
      <section
        className="py-10 md:py-12 bg-stone-50 border-y border-stone-200/70"
        aria-labelledby="home-logged-promotions-heading"
        dir="rtl"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-[#c9a227] mb-2">
              <StarIcon size={22} />
              <span className="text-sm font-bold">مميّز لك</span>
            </div>
            <h2 id="home-logged-promotions-heading" className="text-2xl md:text-3xl font-bold text-[#1a3a2f]">
              إعلانات
            </h2>
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="w-12 h-[1px] bg-[#c9a227]/50" />
              <div className="w-1.5 h-1.5 rotate-45 bg-[#c9a227]" />
              <div className="w-12 h-[1px] bg-[#c9a227]/50" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {items.map((p) => (
              <PromotionCard key={p.id} p={p} userGender={resolvedGenderForCtas} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16 bg-stone-50 border-y border-stone-200/60" aria-labelledby="home-promotions-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-[#c9a227] mb-3">
            <StarIcon size={22} />
            <span className="text-sm font-bold uppercase tracking-wide">مميّز</span>
          </div>
          <h2 id="home-promotions-heading" className="text-2xl md:text-3xl font-bold text-[#1a3a2f]">
            إعلانات
          </h2>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="w-12 h-[1px] bg-[#c9a227]/50" />
            <div className="w-1.5 h-1.5 rotate-45 bg-[#c9a227]" />
            <div className="w-12 h-[1px] bg-[#c9a227]/50" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {items.map((p) => (
            <PromotionCard key={p.id} p={p} userGender={resolvedGenderForCtas} />
          ))}
        </div>
      </div>
    </section>
  );
}
