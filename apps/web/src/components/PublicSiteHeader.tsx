'use client';

import Link from 'next/link';
import ZoomLiveHeaderButton from '@/components/ZoomLiveHeaderButton';
import type { PublicHeaderSurface } from '@/lib/publicHeaderSurface';

export type PublicSiteHeaderUser = {
  name?: string;
  role?: string;
} | null;

type PublicSiteHeaderProps = {
  user: PublicSiteHeaderUser;
  pathname: string;
  /** Controls bar + text colors for contrast on light vs dark page areas */
  surface: PublicHeaderSurface;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  onProfileClick: () => void;
  onLogout: () => void;
};

function navItemClass(active: boolean, surface: PublicHeaderSurface) {
  if (surface === 'light') {
    return [
      'relative rounded-full px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-200 sm:px-2.5 sm:text-sm lg:px-3',
      active
        ? 'bg-[#1a3a2f]/14 text-[#143028] shadow-[inset_0_1px_0_rgba(26,58,47,0.08)] ring-1 ring-[#1a3a2f]/20'
        : 'text-stone-700 hover:bg-stone-200/70 hover:text-[#0f241c]',
    ].join(' ');
  }
  return [
    'relative rounded-full px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-200 sm:px-2.5 sm:text-sm lg:px-3',
    'hover:text-white hover:bg-white/12',
    active
      ? 'text-white bg-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/15'
      : 'text-stone-200',
  ].join(' ');
}

function mobileNavItemClass(active: boolean, surface: PublicHeaderSurface) {
  if (surface === 'light') {
    return [
      'touch-list-item rounded-xl text-sm transition-colors',
      active ? 'bg-[#1a3a2f]/12 text-[#143028] font-medium' : 'text-stone-700 hover:bg-stone-200/80',
    ].join(' ');
  }
  return [
    'touch-list-item rounded-xl text-sm transition-colors',
    active ? 'bg-white/15 text-white' : 'text-stone-300 hover:bg-white/10',
  ].join(' ');
}

export default function PublicSiteHeader({
  user,
  pathname,
  surface,
  menuOpen,
  setMenuOpen,
  onProfileClick,
  onLogout,
}: PublicSiteHeaderProps) {
  const dashboardHref =
    user?.role === 'ADMIN' ? '/admin' : user?.role === 'TEACHER' ? '/teacher' : '/dashboard';

  const dashboardNavActive =
    user?.role === 'ADMIN'
      ? pathname.startsWith('/admin')
      : user?.role === 'TEACHER'
        ? pathname.startsWith('/teacher')
        : pathname === '/dashboard' || pathname.startsWith('/dashboard/');

  const dashboardAction = user ? (
    <Link
      href={dashboardHref}
      className={`inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-medium transition min-h-[40px] sm:min-h-[44px] sm:text-sm ${
        surface === 'light'
          ? dashboardNavActive
            ? 'bg-[#1a3a2f] text-white shadow-sm'
            : 'bg-stone-200/70 text-[#143028] hover:bg-stone-300/70'
          : dashboardNavActive
            ? 'bg-white/16 text-white ring-1 ring-white/15'
            : 'bg-white/8 text-stone-100 hover:bg-white/12 hover:text-white'
      }`}
    >
      {user.role === 'STUDENT' ? 'زادي' : 'لوحة التحكم'}
    </Link>
  ) : null;

  const primaryNav = (
    <>
      <Link href="/" className={navItemClass(pathname === '/', surface)}>
        الرئيسية
      </Link>
      <Link href="/courses" className={navItemClass(pathname === '/courses' || pathname.startsWith('/courses/'), surface)}>
        الدورات
      </Link>
      <Link href="/inquiries" className={navItemClass(pathname === '/inquiries', surface)}>
        الاستفسارات
      </Link>
      <Link href="/about" className={navItemClass(pathname === '/about', surface)}>
        من نحن
      </Link>
      <Link href="/contact" className={navItemClass(pathname === '/contact', surface)}>
        تواصل معنا
      </Link>
    </>
  );

  const authCluster = (
    <div
      className={
        surface === 'light'
          ? 'inline-flex items-center gap-0.5 rounded-full bg-stone-200/60 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-stone-300/70'
          : 'inline-flex items-center gap-0.5 rounded-full bg-black/25 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-white/[0.12] backdrop-blur-md'
      }
      dir="ltr"
    >
      {!user ? (
        <>
          <Link
            href="/register"
            className="rounded-full bg-[#c9a227] px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-[#b08f20] hover:shadow-md active:scale-[0.98] min-h-[40px] sm:min-h-[44px] flex items-center justify-center"
          >
            تسجيل
          </Link>
          <Link
            href="/login"
            className={`rounded-full px-3 py-2 text-xs sm:text-sm font-medium transition min-h-[40px] sm:min-h-[44px] flex items-center justify-center ${
              surface === 'light'
                ? 'text-stone-800 hover:bg-white/90 hover:text-[#0f241c]'
                : 'text-stone-200/90 hover:bg-white/10 hover:text-white'
            }`}
          >
            دخول
          </Link>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onProfileClick}
            className={`flex max-w-[9rem] items-center gap-2 rounded-full py-1.5 pe-1.5 ps-1.5 md:pe-2 transition min-h-[40px] sm:min-h-[44px] ${
              surface === 'light' ? 'hover:bg-white/80' : 'hover:bg-white/10'
            }`}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#c9a227] text-xs font-semibold text-white">
              {user.name?.charAt(0) || 'U'}
            </div>
            <span
              className={`hidden truncate text-xs font-medium md:inline sm:text-sm ${
                surface === 'light' ? 'text-[#143028]' : 'text-white'
              }`}
            >
              {user.name}
            </span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className={`rounded-full px-2.5 py-2 text-xs font-medium transition min-h-[40px] sm:min-h-[44px] ${
              surface === 'light'
                ? 'text-stone-500 hover:bg-stone-300/50 hover:text-red-700'
                : 'text-stone-400 hover:bg-white/10 hover:text-red-300'
            }`}
          >
            خروج
          </button>
        </>
      )}
    </div>
  );

  const logoBlock = (compact?: boolean) => (
    <Link
      href="/"
      className={`group flex min-w-0 items-center gap-2 rounded-xl transition ${
        surface === 'light' ? 'hover:bg-stone-200/60' : 'hover:bg-white/5'
      } ${compact ? 'max-w-[min(50vw,200px)]' : ''}`}
      dir="rtl"
    >
      <img
        src="/photos/ZadLogo.jpeg"
        alt="زاد الهداية"
        className={`w-auto shrink-0 rounded object-contain ${compact ? 'h-8 sm:h-9 max-w-[120px] sm:max-w-[140px]' : 'h-9 max-w-[140px]'}`}
        width={140}
        height={36}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <span
        className={`font-semibold transition ${
          surface === 'light'
            ? `text-[#143028] group-hover:text-[#1a3a2f] ${compact ? 'hidden truncate text-lg sm:block' : 'truncate text-lg'}`
            : `text-white transition group-hover:text-[#f5e6b8] ${compact ? 'hidden truncate text-lg sm:block' : 'truncate text-lg'}`
        }`}
      >
        زاد الهداية
      </span>
    </Link>
  );

  const mainNav = (
    <nav
      className={
        surface === 'light'
          ? 'inline-flex items-center justify-center gap-1 rounded-full bg-stone-100/95 px-1.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-stone-200/90 sm:gap-1.5'
          : 'inline-flex items-center justify-center gap-1 rounded-full bg-black/22 px-1.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-white/[0.1] backdrop-blur-md sm:gap-1.5'
      }
      aria-label="التنقل الرئيسي"
      dir="rtl"
    >
      {primaryNav}
    </nav>
  );

  const menuToggle = (
    <button
      type="button"
      onClick={() => setMenuOpen(!menuOpen)}
      className={
        surface === 'light'
          ? 'touch-icon-btn flex size-11 shrink-0 items-center justify-center rounded-xl border border-stone-300/90 bg-white text-stone-700 shadow-sm transition hover:border-stone-400 hover:bg-stone-50 hover:text-[#143028]'
          : 'touch-icon-btn flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-stone-200 shadow-sm transition hover:border-white/25 hover:bg-white/10 hover:text-white'
      }
      aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
      aria-expanded={menuOpen}
    >
      <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {menuOpen ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
    </button>
  );

  const headerShell =
    surface === 'light'
      ? 'border-b border-stone-200/95 bg-[#fbf9f4] shadow-[0_1px_0_rgba(26,58,47,0.04)]'
      : 'border-b border-[#142f27] bg-[#1a3a2f] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]';

  const drawerShell =
    surface === 'light'
      ? 'border-t border-stone-200/90 bg-[#fbf9f4] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
      : 'border-t border-white/10 bg-[#1a3a2f]';

  return (
    <header
      className={`sticky top-0 z-50 ${headerShell}`}
      role="banner"
      data-header-surface={surface}
    >
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8">
        {/* Mobile: single row — auth · live · logo · hamburger (dashboard link lives in drawer) */}
        <div className="w-full py-2.5 md:hidden" dir="ltr">
          <div className="flex w-full items-center justify-between gap-1.5 sm:gap-2">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              {authCluster}
              <ZoomLiveHeaderButton
                surface={surface}
                className="!w-auto min-h-[40px] max-w-[min(36vw,9rem)] shrink px-2 py-1.5 text-xs sm:max-w-[10rem] sm:px-2.5 sm:text-sm"
              />
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2" dir="ltr">
              {logoBlock(true)}
              {menuToggle}
            </div>
          </div>
        </div>

        {/* Desktop: يسار = الإجراءات | يمين = الروابط بجوار الشعار حتى لا تنهار عند اتساع زر البث */}
        <div
          className="hidden min-h-[4.25rem] grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 py-2.5 md:grid lg:gap-x-4"
          dir="ltr"
        >
          <div className="flex min-w-0 items-center justify-self-start gap-2 lg:gap-3">
            {authCluster}
            {dashboardAction}
            <ZoomLiveHeaderButton surface={surface} className="w-auto shrink-0" />
          </div>

          <div className="flex items-center justify-self-end" dir="rtl">
            {mainNav}
          </div>

          <div className="flex min-w-0 items-center justify-self-end" dir="rtl">
            {logoBlock()}
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className={`backdrop-blur-sm md:hidden ${drawerShell}`}>
          <nav className="space-y-1 px-4 py-4" aria-label="قائمة التنقل">
            <Link href="/" onClick={() => setMenuOpen(false)} className={mobileNavItemClass(pathname === '/', surface)}>
              الرئيسية
            </Link>
            <Link
              href="/courses"
              onClick={() => setMenuOpen(false)}
              className={mobileNavItemClass(pathname === '/courses' || pathname.startsWith('/courses/'), surface)}
            >
              الدورات
            </Link>
            <Link
              href="/inquiries"
              onClick={() => setMenuOpen(false)}
              className={mobileNavItemClass(pathname === '/inquiries', surface)}
            >
              الاستفسارات
            </Link>
            <Link href="/about" onClick={() => setMenuOpen(false)} className={mobileNavItemClass(pathname === '/about', surface)}>
              من نحن
            </Link>
            <Link
              href="/contact"
              onClick={() => setMenuOpen(false)}
              className={mobileNavItemClass(pathname === '/contact', surface)}
            >
              تواصل معنا
            </Link>

            {user ? (
              <>
                <Link
                  href={dashboardHref}
                  onClick={() => setMenuOpen(false)}
                  className={mobileNavItemClass(dashboardNavActive, surface)}
                >
                  {user.role === 'STUDENT' ? 'زادي' : 'لوحة التحكم'}
                </Link>
                {user.role === 'STUDENT' && (
                  <>
                    <Link
                      href="/dashboard/questions"
                      onClick={() => setMenuOpen(false)}
                      className={mobileNavItemClass(pathname === '/dashboard/questions', surface)}
                    >
                      أسئلتي
                    </Link>
                    <Link
                      href="/dashboard/reports"
                      onClick={() => setMenuOpen(false)}
                      className={mobileNavItemClass(pathname === '/dashboard/reports', surface)}
                    >
                      تبليغاتي
                    </Link>
                  </>
                )}

                <div className={`mt-4 border-t pt-4 ${surface === 'light' ? 'border-stone-200' : 'border-white/10'}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onProfileClick();
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 transition ${
                      surface === 'light' ? 'hover:bg-stone-200/70' : 'hover:bg-white/10'
                    }`}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#c9a227] text-sm font-medium text-white">
                      {user.name?.charAt(0) || 'U'}
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${surface === 'light' ? 'text-[#143028]' : 'text-white'}`}>{user.name}</p>
                      <p className={`text-xs ${surface === 'light' ? 'text-stone-500' : 'text-stone-400'}`}>
                        {user.role === 'ADMIN' ? 'مشرف' : user.role === 'TEACHER' ? 'مدرس' : 'طالب'}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={onLogout}
                    className={`touch-list-item w-full rounded-xl text-right text-sm ${
                      surface === 'light' ? 'text-red-700 hover:bg-red-50' : 'text-red-400 hover:bg-white/10'
                    }`}
                  >
                    تسجيل الخروج
                  </button>
                </div>
              </>
            ) : (
              <div className={`mt-4 space-y-2 border-t pt-4 ${surface === 'light' ? 'border-stone-200' : 'border-white/10'}`}>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className={`touch-list-item rounded-xl text-sm ${
                    surface === 'light' ? 'text-stone-700 hover:bg-stone-200/80' : 'text-stone-300 hover:bg-white/10'
                  }`}
                >
                  تسجيل الدخول
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="touch-btn block w-full rounded-xl bg-[#c9a227] py-3 text-center text-sm font-semibold text-white hover:bg-[#b08f20]"
                >
                  إنشاء حساب
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
