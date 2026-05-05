'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import ProfileModal from '@/components/ProfileModal';
import { handleLogout as performLogout } from '@/lib/navigation';

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        // Don't redirect, just set user to null
        setUser(null);
        setLoading(false);
        return;
      }

      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      // Keep user logged in even if API fails
      const userStr = localStorage.getItem('user');
      if (userStr) {
        setUser(JSON.parse(userStr));
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
    { href: '/dashboard', label: 'زادي' },
    { href: '/courses', label: 'الدورات' },
    { href: '/dashboard/exams', label: 'الامتحانات' },
    { href: '/dashboard/homework', label: 'الواجبات' },
    { href: '/dashboard/grades', label: 'الدرجات' },
    { href: '/dashboard/questions', label: 'أسئلتي' },
    { href: '/dashboard/reports', label: 'تبليغاتي' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#1a3a2f] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
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

              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-1.5 rounded text-sm transition-colors ${
                        isActive
                          ? 'bg-white/15 text-white'
                          : 'text-stone-200 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <Link
                    href="/"
                    className="hidden md:block px-2 py-1.5 text-sm text-stone-200 hover:text-white transition-colors"
                  >
                    الموقع
                  </Link>

                  <div className="hidden md:block h-4 w-px bg-white/20"></div>

                  <button
                    onClick={handleProfileClick}
                    className="hidden md:flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10 transition-colors"
                  >
                    <span className="text-sm text-white">{user.name}</span>
                    <div className="w-7 h-7 bg-[#c9a227] rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {user.name?.charAt(0) || 'S'}
                    </div>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="hidden md:block px-2 py-1.5 text-sm text-stone-300 hover:text-red-400 transition-colors"
                  >
                    خروج
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-1.5 bg-[#c9a227] text-white rounded text-sm hover:bg-[#b08f20] transition-colors"
                >
                  تسجيل الدخول
                </Link>
              )}

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-1.5 text-stone-200 hover:text-white rounded"
                aria-label="القائمة"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="md:hidden border-t border-white/10 bg-[#1a3a2f]">
            <nav className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`block px-3 py-2 rounded text-sm ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-stone-200 hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              
              {user && (
                <div className="border-t border-white/10 pt-3 mt-3">
                  <button
                    onClick={() => { setMenuOpen(false); handleProfileClick(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10 transition-colors"
                  >
                    <div className="w-8 h-8 bg-[#c9a227] rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {user.name?.charAt(0) || 'S'}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white">{user.name}</p>
                      <p className="text-xs text-stone-300">{user.email}</p>
                    </div>
                  </button>
                  <Link
                    href="/"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-stone-200 hover:bg-white/10 rounded"
                  >
                    الموقع الرئيسي
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-right px-3 py-2 text-sm text-red-400 hover:bg-white/10 rounded"
                  >
                    تسجيل الخروج
                  </button>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#1a3a2f] text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-3">زاد الهداية</h3>
              <p className="text-stone-400 text-sm leading-relaxed">
                منصة تعليمية للعلوم الشرعية تهدف لتسهيل طلب العلم للجميع
              </p>
              <p className="text-stone-300 text-sm leading-relaxed mt-3 border-t border-white/10 pt-3">
                المنصة متاحة للجميع <span className="text-[#c9a227] font-medium">مجاناً</span>. لمن يحتاج مساعدة في إنشاء
                موقع إلكتروني لمشروعه، يمكنكم التواصل معنا عبر البريد في قسم «تواصل معنا».
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-3 text-[#c9a227]">روابط سريعة</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/courses" className="text-stone-400 hover:text-white transition">الدورات</Link></li>
                <li><Link href="/dashboard" className="text-stone-400 hover:text-white transition">زادي</Link></li>
                <li><Link href="/dashboard/exams" className="text-stone-400 hover:text-white transition">الامتحانات</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-3 text-[#c9a227]">الموارد</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/dashboard/homework" className="text-stone-400 hover:text-white transition">الواجبات</Link></li>
                <li><Link href="/dashboard/grades" className="text-stone-400 hover:text-white transition">الدرجات</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-3 text-[#c9a227]">تواصل معنا</h4>
              <ul className="space-y-2 text-stone-400 text-sm">
                <li>
                  <a
                    href="mailto:support@your-domain.com"
                    className="hover:text-white transition underline-offset-2 hover:underline"
                  >
                    support@your-domain.com
                  </a>
                </li>
                <li dir="ltr" className="text-right">+97252-377-9400</li>
                <li>باقة الغربية</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <a
                  href="https://www.facebook.com/NadyHedaya1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition"
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
                  className="w-8 h-8 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition"
                  aria-label="Instagram"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
              <p className="text-stone-500 text-sm">
                © 2025 زاد الهداية
              </p>
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

