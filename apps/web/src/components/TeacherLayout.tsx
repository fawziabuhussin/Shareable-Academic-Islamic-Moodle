'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import ProfileModal from '@/components/ProfileModal';
import { AlertIcon } from '@/components/Icons';
import { showSuccess, TOAST_MESSAGES } from '@/lib/toast';
import { navigateTo, handleLogout as performLogout } from '@/lib/navigation';

interface TeacherLayoutProps {
  children: React.ReactNode;
}

export default function TeacherLayout({ children }: TeacherLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [newReportsCount, setNewReportsCount] = useState(0);
  const [newQuestionsCount, setNewQuestionsCount] = useState(0);

  const loadNotificationCounts = useCallback(async () => {
    try {
      const [reportsRes, questionsRes] = await Promise.all([
        api.get('/reports/count/new').catch(() => ({ data: { count: 0 } })),
        api.get('/questions/new-count').catch(() => ({ data: { count: 0 } })),
      ]);
      setNewReportsCount(reportsRes.data?.count || 0);
      setNewQuestionsCount(questionsRes.data?.count || 0);
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

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const userStr = localStorage.getItem('user');
      
      // First, try to get user from localStorage (faster, no API call)
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          if (userData.role === 'TEACHER' || userData.role === 'ADMIN') {
            setUser(userData);
            setLoading(false);
            // Try to refresh user data in background
            if (token) {
              api.get('/auth/me')
                .then(res => {
                  setUser(res.data);
                  localStorage.setItem('user', JSON.stringify(res.data));
                })
                .catch(() => {
                  // API failed but we have cached user, continue
                });
            }
            return;
          }
        } catch (e) {
          // Invalid user data in localStorage
        }
      }

      // If no cached user, check token and fetch from API
      if (!token) {
        navigateTo('/login', router);
        return;
      }

      const response = await api.get('/auth/me');
      const userData = response.data;
      
      // Allow TEACHER and ADMIN to access teacher panel
      if (userData.role !== 'TEACHER' && userData.role !== 'ADMIN') {
        // If user is STUDENT, redirect to student dashboard
        if (userData.role === 'STUDENT') {
          navigateTo('/dashboard', router);
        } else {
          navigateTo('/login', router);
        }
        return;
      }

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error: any) {
      // If API call fails, check if we have cached user
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          if (userData.role === 'TEACHER' || userData.role === 'ADMIN') {
            setUser(userData);
            setLoading(false);
            return;
          }
        } catch (e) {
          // Invalid user data
        }
      }
      
      // Only redirect to login if we have no valid cached user
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigateTo('/login', router);
      } else {
        // Network error or other issue, try to use cached user
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const userData = JSON.parse(userStr);
            if (userData.role === 'TEACHER' || userData.role === 'ADMIN') {
              setUser(userData);
              setLoading(false);
              return;
            }
          } catch (e) {
            // Invalid user data
          }
        }
        // If no cached user and API failed, redirect to login
        navigateTo('/login', router);
      }
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
    { href: '/teacher', label: 'لوحة التحكم', category: 'main' },
    { href: '/teacher/courses', label: 'دوراتي', category: 'content' },
    { href: '/teacher/exams', label: 'الامتحانات', category: 'assessments' },
    { href: '/teacher/homework', label: 'الواجبات', category: 'assessments' },
    { href: '/teacher/grades', label: 'التقييمات النهائية', category: 'assessments' },
    { href: '/teacher/reports', label: 'التبليغات', category: 'reports', hasBadge: true, badgeType: 'reports' },
    { href: '/teacher/questions', label: 'الأسئلة', category: 'questions', hasBadge: true, badgeType: 'questions' },
  ];

  const categories = [
    { id: 'main', label: 'الرئيسية' },
    { id: 'content', label: 'المحتوى' },
    { id: 'assessments', label: 'التقييمات' },
    { id: 'reports', label: 'التبليغات' },
    { id: 'questions', label: 'الأسئلة' },
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
              <Link href="/teacher" className="flex items-center gap-2 shrink-0">
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

              <nav className="hidden lg:flex items-center gap-1">
                {navItems.map((item: any) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  const badgeCount = item.badgeType === 'reports' ? newReportsCount : item.badgeType === 'questions' ? newQuestionsCount : 0;
                  const showBadge = item.hasBadge && badgeCount > 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-1.5 rounded text-sm transition-colors relative flex items-center gap-1 ${
                        isActive
                          ? 'bg-white/15 text-white'
                          : 'text-stone-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {item.label}
                      {showBadge && (
                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                          {badgeCount > 9 ? '9+' : badgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

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
                <span className="text-sm text-white">{user?.name || 'المدرس'}</span>
                <div className="w-7 h-7 bg-[#c9a227] rounded-full flex items-center justify-center text-white text-xs font-medium">
                  {user?.name?.charAt(0) || 'T'}
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

        {menuOpen && (
          <div className="lg:hidden border-t border-white/10 bg-[#1a3a2f]">
            <nav className="px-4 py-3 space-y-1">
              {navItems.map((item: any) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const badgeCount = item.badgeType === 'reports' ? newReportsCount : item.badgeType === 'questions' ? newQuestionsCount : 0;
                const showBadge = item.hasBadge && badgeCount > 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`touch-list-item justify-between rounded-lg text-sm ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-stone-300 hover:bg-white/10'
                    }`}
                  >
                    <span>{item.label}</span>
                    {showBadge && (
                      <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                        {badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
              
              <div className="border-t border-white/10 pt-3 mt-3">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 bg-[#c9a227] rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0">
                    {user?.name?.charAt(0) || 'T'}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{user?.name || 'المدرس'}</p>
                    <p className="text-xs text-stone-400">{user?.email || ''}</p>
                  </div>
                </div>
                <Link
                  href="/"
                  onClick={() => setMenuOpen(false)}
                  className="touch-list-item text-sm text-stone-300 hover:bg-white/10 rounded-lg"
                >
                  الموقع الرئيسي
                </Link>
                <button
                  onClick={handleLogout}
                  className="touch-list-item w-full text-right text-sm text-red-400 hover:bg-white/10 rounded-lg"
                >
                  تسجيل الخروج
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1" style={{ overflow: 'visible', position: 'relative' }}>
        <div style={{ overflow: 'visible', position: 'relative', maxWidth: '100%', width: '100%' }}>
          {children}
        </div>
      </main>

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
