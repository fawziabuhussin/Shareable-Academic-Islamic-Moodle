'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import ProfileModal from '@/components/ProfileModal';
import { showSuccess, TOAST_MESSAGES } from '@/lib/toast';
import { SkipLink } from '@/components/Accessibility';
import MobileBottomNav from '@/components/MobileBottomNav';
import { handleLogout as performLogout } from '@/lib/navigation';
import { SITE_CONTACT } from '@/lib/siteContact';
import PublicSiteHeader from '@/components/PublicSiteHeader';
import { getPublicHeaderSurface } from '@/lib/publicHeaderSurface';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Listen for auth:logout events (e.g. token expiry, ban) to clear stale user state
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        })
        .catch(() => {
          try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
              setUser(JSON.parse(userStr));
            }
          } catch (e) {
            // Invalid JSON in localStorage, clear it
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
          }
        });
    } else {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          setUser(JSON.parse(userStr));
        }
      } catch (e) {
        // Invalid JSON in localStorage, clear it
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      showSuccess(TOAST_MESSAGES.LOGOUT_SUCCESS);
      // Use centralized logout handler - clears storage and does hard navigation
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

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col">
      {/* Skip Navigation Link - visible on Tab */}
      <SkipLink targetId="main-content" />
      
      <PublicSiteHeader
        user={user}
        pathname={pathname}
        surface={getPublicHeaderSurface(pathname)}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        onProfileClick={handleProfileClick}
        onLogout={handleLogout}
      />

      <main 
        id="main-content" 
        className={`flex-1 ${user ? 'has-bottom-nav' : ''}`} 
        role="main"
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation - only for logged-in users */}
      <MobileBottomNav user={user} />

      {/* Footer */}
      <footer className="bg-[#1a3a2f] text-white mt-auto" role="contentinfo">
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
                <li><Link href="/inquiries" className="text-stone-400 hover:text-white transition">استفسارات</Link></li>
                {user && (
                  <li>
                    <Link 
                      href={
                        user.role === 'ADMIN' 
                          ? '/admin' 
                          : user.role === 'TEACHER' 
                          ? '/teacher' 
                          : '/dashboard'
                      } 
                      className="text-stone-400 hover:text-white transition"
                    >
                      {user.role === 'STUDENT' ? 'زادي' : 'لوحة التحكم'}
                    </Link>
                  </li>
                )}
                <li><Link href="/institute" className="text-stone-400 hover:text-white transition">عن المعهد</Link></li>
                <li><Link href="/about" className="text-stone-400 hover:text-white transition">من نحن</Link></li>
                <li><Link href="/contact" className="text-stone-400 hover:text-white transition">تواصل معنا</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-3 text-[#c9a227]">تواصل معنا</h4>
              <ul className="space-y-2 text-stone-400 text-sm">
                <li>
                  <a
                    href={`mailto:${SITE_CONTACT.email}`}
                    className="hover:text-white transition underline-offset-2 hover:underline"
                  >
                    {SITE_CONTACT.email}
                  </a>
                </li>
                <li dir="ltr" className="text-right">
                  <a
                    href={`tel:${SITE_CONTACT.phoneE164}`}
                    className="hover:text-white transition underline-offset-2 hover:underline"
                  >
                    {SITE_CONTACT.phoneDisplay}
                  </a>
                </li>
                <li>{SITE_CONTACT.location}</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <img 
                src="/photos/bottom photo.png" 
                alt="زاد الهداية" 
                className="h-12 w-auto object-contain opacity-80"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="flex items-center gap-3">
                <a
                  href={SITE_CONTACT.facebookUrl}
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
                  href={SITE_CONTACT.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition"
                  aria-label="Instagram"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <span className="text-xs text-stone-500 mr-4">© 2025 زاد الهداية</span>
              </div>
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

