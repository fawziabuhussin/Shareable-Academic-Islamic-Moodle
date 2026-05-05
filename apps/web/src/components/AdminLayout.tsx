'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import ProfileModal from '@/components/ProfileModal';
import { AlertIcon } from '@/components/Icons';
import { showSuccess, TOAST_MESSAGES } from '@/lib/toast';
import { navigateTo, handleLogout as performLogout } from '@/lib/navigation';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [newReportsCount, setNewReportsCount] = useState(0);
  const [newQuestionsCount, setNewQuestionsCount] = useState(0);
  const [newInquiriesCount, setNewInquiriesCount] = useState(0);

  const loadNotificationCounts = useCallback(async () => {
    try {
      const [reportsRes, questionsRes, inquiriesRes] = await Promise.all([
        api.get('/reports/count/new').catch(() => ({ data: { count: 0 } })),
        api.get('/questions/new-count').catch(() => ({ data: { count: 0 } })),
        api.get('/student-inquiries/admin/new-count').catch(() => ({ data: { count: 0 } })),
      ]);
      setNewReportsCount(reportsRes.data?.count || 0);
      setNewQuestionsCount(questionsRes.data?.count || 0);
      setNewInquiriesCount(inquiriesRes.data?.count || 0);
    } catch (error) {
      // Silently fail
    }
  }, []);

  // Listen for auth:logout events (e.g. token expiry, ban) to clear stale user state
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  // Poll for new reports and questions count
  useEffect(() => {
    if (user) {
      loadNotificationCounts();
      const interval = setInterval(loadNotificationCounts, 60000); // Every 1 minute
      return () => clearInterval(interval);
    }
  }, [user, loadNotificationCounts]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigateTo('/login', router);
        return;
      }

      const response = await api.get('/auth/me');
      const userData = response.data;
      
      if (userData.role !== 'ADMIN') {
        navigateTo('/dashboard', router);
        return;
      }

      setUser(userData);
    } catch (error) {
      navigateTo('/login', router);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      showSuccess(TOAST_MESSAGES.LOGOUT_SUCCESS);
      performLogout();
    }
  };

  const handleProfileClick = () => {
    if (!user) return;
    setShowProfile(true);
  };

  const handleProfileUpdated = (updatedUser: any) => {
    setUser((prev: any) => ({ ...prev, name: updatedUser.name, firstName: updatedUser.firstName, fatherName: updatedUser.fatherName, familyName: updatedUser.familyName }));
  };

  const navItems = [
    { href: '/admin/courses', label: 'إدارة الدورات', category: 'content' },
    { href: '/admin/categories', label: 'الفئات', category: 'content' },
    { href: '/admin/home-promotions', label: 'إعلانات الصفحة الرئيسية', category: 'content' },
    { href: '/admin/zoom-live', label: 'بث زووم مباشر', category: 'content' },
    { href: '/admin/site-content', label: 'روابط الصفحات العامة', category: 'content' },
    { href: '/admin/public-faq', label: 'الأسئلة الشائعة (عامة)', category: 'content' },
    { href: '/admin/users', label: 'إدارة المستخدمين', category: 'users' },
    { href: '/admin/enrollments', label: 'التسجيلات', category: 'users' },
    { href: '/admin/exams', label: 'الامتحانات', category: 'assessments' },
    { href: '/admin/homework', label: 'الواجبات', category: 'assessments' },
    { href: '/admin/grades', label: 'التقييمات النهائية', category: 'assessments' },
  ];

  const categories = [
    { id: 'content', label: 'المحتوى' },
    { id: 'users', label: 'المستخدمين' },
    { id: 'assessments', label: 'التقييمات' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#1a3a2f] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Right Side: Logo + Navigation (RTL) */}
            <div className="flex items-center gap-6">
              {/* Logo */}
              <Link href="/admin" className="flex items-center gap-2 shrink-0">
                <img 
                  src="/photos/ZadLogo.jpeg" 
                  alt="زاد الهداية" 
                  className="h-8 sm:h-9 w-auto max-w-[140px] object-contain rounded"
                  width={140}
                  height={36}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="hidden sm:block text-lg font-semibold text-white">زاد الهداية</span>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-1">
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    pathname === '/admin' || pathname === '/admin/'
                      ? 'bg-white/15 text-white'
                      : 'text-stone-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  الرئيسية
                </Link>

                {categories.map((category) => {
                  const categoryItems = navItems.filter(item => item.category === category.id);
                  if (categoryItems.length === 0) return null;
                  
                  return (
                    <div key={category.id} className="relative group">
                      <button className="flex items-center gap-1 px-3 py-1.5 rounded text-sm text-stone-300 hover:text-white hover:bg-white/10 transition-colors">
                        <span>{category.label}</span>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded shadow-lg border border-stone-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                        <div className="py-1">
                          {categoryItems.map((item: any) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                className={`block px-4 py-2 text-sm ${
                                  isActive
                                    ? 'bg-stone-100 text-[#1a3a2f] font-medium'
                                    : 'text-stone-600 hover:bg-stone-50'
                                }`}
                              >
                                {item.label}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Reports Link - Direct with Badge */}
                <Link
                  href="/admin/reports"
                  className={`px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-2 ${
                    pathname === '/admin/reports' || pathname.startsWith('/admin/reports/')
                      ? 'bg-white/15 text-white'
                      : 'text-stone-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>التبليغات</span>
                  {newReportsCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse min-w-[20px] text-center">
                      {newReportsCount > 99 ? '99+' : newReportsCount}
                    </span>
                  )}
                </Link>

                {/* Questions Link - Direct with Badge */}
                <Link
                  href="/admin/questions"
                  className={`px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-2 ${
                    pathname === '/admin/questions' || pathname.startsWith('/admin/questions/')
                      ? 'bg-white/15 text-white'
                      : 'text-stone-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>الأسئلة</span>
                  {newQuestionsCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse min-w-[20px] text-center">
                      {newQuestionsCount > 99 ? '99+' : newQuestionsCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/admin/student-inquiries"
                  className={`px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-2 ${
                    pathname === '/admin/student-inquiries' || pathname.startsWith('/admin/student-inquiries/')
                      ? 'bg-white/15 text-white'
                      : 'text-stone-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>استفسارات</span>
                  {newInquiriesCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse min-w-[20px] text-center">
                      {newInquiriesCount > 99 ? '99+' : newInquiriesCount}
                    </span>
                  )}
                </Link>
              </nav>
            </div>

            {/* Left Side: User Actions (RTL) */}
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="hidden md:block px-2 py-1.5 text-sm text-stone-300 hover:text-white transition-colors"
              >
                الموقع
              </Link>

              <div className="hidden md:block h-4 w-px bg-white/20"></div>

              <button
                onClick={handleProfileClick}
                className="hidden md:flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10 transition-colors"
              >
                <span className="text-sm text-white">{user?.name || 'المدير'}</span>
                <div className="w-7 h-7 bg-[#c9a227] rounded-full flex items-center justify-center text-white text-xs font-medium">
                  {user?.name?.charAt(0) || 'A'}
                </div>
              </button>

              <button
                onClick={handleLogout}
                className="hidden md:block px-2 py-1.5 text-sm text-stone-400 hover:text-red-400 transition-colors"
              >
                خروج
              </button>

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden touch-icon-btn text-stone-300 hover:text-white hover:bg-white/10 rounded-lg"
                aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
                aria-expanded={menuOpen}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {menuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile drawer: fixed panel + scrollable nav + pinned footer (easier to scroll on phone) */}
        {menuOpen && (
          <>
            <button
              type="button"
              className="lg:hidden fixed inset-0 z-[55] bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-200"
              aria-label="إغلاق القائمة"
              onClick={() => setMenuOpen(false)}
            />
            <div
              className="lg:hidden fixed inset-x-0 top-14 bottom-0 z-[60] flex flex-col bg-gradient-to-b from-[#1a3a2f] to-[#0f241c] shadow-[0_-8px_32px_rgba(0,0,0,0.35)] border-t border-white/10 rounded-t-2xl overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label="قائمة الإدارة"
            >
              <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#1a3a2f]/90">
                <span className="text-sm font-semibold text-[#c9a227] tracking-wide">قائمة الإدارة</span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="touch-icon-btn rounded-xl bg-white/10 text-white hover:bg-white/20"
                  aria-label="إغلاق"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <nav
                className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 py-2 space-y-3 [touch-action:pan-y] [-webkit-overflow-scrolling:touch] pb-2"
              >
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center min-h-[52px] px-4 rounded-xl text-[15px] font-medium transition-colors active:scale-[0.99] ${
                    pathname === '/admin' || pathname === '/admin/'
                      ? 'bg-[#c9a227]/20 text-white ring-1 ring-[#c9a227]/40'
                      : 'text-stone-200 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  الرئيسية
                </Link>

                {categories.map((category) => {
                  const categoryItems = navItems.filter((item) => item.category === category.id);
                  if (categoryItems.length === 0) return null;

                  return (
                    <div key={category.id} className="space-y-1.5">
                      <div className="sticky top-0 z-[1] -mx-1 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#c9a227]/90 bg-gradient-to-l from-[#1a3a2f] via-[#1a3a2f] to-transparent backdrop-blur-sm border-b border-[#c9a227]/20 rounded-t-lg">
                        {category.label}
                      </div>
                      <div className="space-y-1 pr-1">
                        {categoryItems.map((item: any) => {
                          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMenuOpen(false)}
                              className={`flex items-center min-h-[52px] px-4 rounded-xl text-[15px] transition-colors active:scale-[0.99] border-r-[3px] ${
                                isActive
                                  ? 'bg-white/12 text-white font-semibold border-[#c9a227]'
                                  : 'text-stone-300 bg-white/[0.04] hover:bg-white/10 border-transparent'
                              }`}
                            >
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div className="h-px bg-white/10 my-1" />

                <Link
                  href="/admin/reports"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between min-h-[52px] px-4 rounded-xl text-[15px] font-medium transition-colors active:scale-[0.99] ${
                    pathname === '/admin/reports' || pathname.startsWith('/admin/reports/')
                      ? 'bg-[#c9a227]/20 text-white ring-1 ring-[#c9a227]/40'
                      : 'text-stone-200 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span>التبليغات</span>
                  {newReportsCount > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[1.5rem] text-center">
                      {newReportsCount > 99 ? '99+' : newReportsCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/admin/questions"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between min-h-[52px] px-4 rounded-xl text-[15px] font-medium transition-colors active:scale-[0.99] ${
                    pathname === '/admin/questions' || pathname.startsWith('/admin/questions/')
                      ? 'bg-[#c9a227]/20 text-white ring-1 ring-[#c9a227]/40'
                      : 'text-stone-200 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span>الأسئلة</span>
                  {newQuestionsCount > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[1.5rem] text-center">
                      {newQuestionsCount > 99 ? '99+' : newQuestionsCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/admin/student-inquiries"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between min-h-[52px] px-4 rounded-xl text-[15px] font-medium transition-colors active:scale-[0.99] ${
                    pathname === '/admin/student-inquiries' || pathname.startsWith('/admin/student-inquiries/')
                      ? 'bg-[#c9a227]/20 text-white ring-1 ring-[#c9a227]/40'
                      : 'text-stone-200 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span>استفسارات الطلاب</span>
                  {newInquiriesCount > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[1.5rem] text-center">
                      {newInquiriesCount > 99 ? '99+' : newInquiriesCount}
                    </span>
                  )}
                </Link>
              </nav>

              <div className="shrink-0 border-t border-white/15 bg-[#142922]/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-1 shadow-[0_-4px_24px_rgba(0,0,0,0.2)]">
                <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5">
                  <div className="w-11 h-11 bg-[#c9a227] rounded-full flex items-center justify-center text-white text-base font-semibold shrink-0 ring-2 ring-white/20">
                    {user?.name?.charAt(0) || 'A'}
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <p className="text-sm text-white font-semibold truncate">{user?.name || 'المدير'}</p>
                    <p className="text-xs text-stone-400 truncate">{user?.email || ''}</p>
                  </div>
                </div>
                <Link
                  href="/"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center min-h-[48px] px-4 rounded-xl text-sm text-stone-200 bg-white/5 hover:bg-white/10 active:bg-white/15"
                >
                  الموقع الرئيسي
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center w-full min-h-[48px] px-4 rounded-xl text-sm font-medium text-red-300 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/25"
                >
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1" style={{ overflow: 'visible', position: 'relative' }}>
        <div style={{ overflow: 'visible', position: 'relative', maxWidth: '100%', width: '100%' }}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1a3a2f] mt-auto py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-right max-w-xl">
              <p className="text-white font-semibold">زاد الهداية</p>
              <p className="mt-1 text-sm text-stone-400">منصة تعليمية للعلوم الشرعية</p>
              <p className="mt-3 text-xs text-stone-300 leading-relaxed">
                المنصة متاحة <span className="text-[#c9a227] font-medium">مجاناً</span>. لمساعدتكم في إنشاء موقع
                إلكتروني:{' '}
                <a
                  href="mailto:support@your-domain.com"
                  className="text-stone-200 hover:text-white underline underline-offset-2"
                >
                  support@your-domain.com
                </a>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://www.facebook.com/NadyHedaya1"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a
                href="https://www.instagram.com/nadyhedaya/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <span className="text-xs text-stone-500 mr-4">© 2025</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        user={user}
        onProfileUpdated={handleProfileUpdated}
      />
    </div>
  );
}
