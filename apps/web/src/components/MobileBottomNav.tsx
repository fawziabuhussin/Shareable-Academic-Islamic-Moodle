'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  matchPaths?: string[];
}

interface MobileBottomNavProps {
  /** User object - nav only shows when user is logged in */
  user: {
    id: string;
    name: string;
    role: string;
  } | null;
}

// Icons as separate components for cleaner code
const HomeIcon = () => (
  <svg className="bottom-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const CoursesIcon = () => (
  <svg className="bottom-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const ExamsIcon = () => (
  <svg className="bottom-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ProfileIcon = () => (
  <svg className="bottom-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const DashboardIcon = () => (
  <svg className="bottom-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const GradesIcon = () => (
  <svg className="bottom-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const HomeworkIcon = () => (
  <svg className="bottom-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

export default function MobileBottomNav({ user }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [activeExamsCount, setActiveExamsCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // Only show for logged-in users
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch active exams count for badge
  useEffect(() => {
    if (!user || user.role?.toUpperCase() !== 'STUDENT') return;

    const fetchBadgeCounts = async () => {
      try {
        // Get enrollments
        const enrollmentsRes = await api.get('/enrollments/my-enrollments');
        const enrollments = enrollmentsRes.data || [];
        
        if (enrollments.length === 0) return;

        const now = new Date();
        let activeExams = 0;

        // Fetch exams for each enrolled course
        const examPromises = enrollments.map(async (enrollment: any) => {
          try {
            const res = await api.get(`/exams/course/${enrollment.course.id}`);
            const exams = res.data?.data || res.data || [];
            return exams;
          } catch {
            return [];
          }
        });

        const examResults = await Promise.all(examPromises);
        
        examResults.forEach((exams: any[]) => {
          exams.forEach((exam: any) => {
            const startDate = new Date(exam.startDate);
            const endDate = new Date(exam.endDate);
            const hasAttempt = exam.attempts && exam.attempts.length > 0;
            
            // Count active exams (available now, not attempted)
            if (startDate <= now && endDate >= now && !hasAttempt) {
              activeExams++;
            }
          });
        });

        setActiveExamsCount(activeExams);
      } catch (error) {
        console.error('Error fetching badge counts:', error);
      }
    };

    fetchBadgeCounts();
  }, [user]);

  // Don't render on server or for non-authenticated users
  if (!isMounted || !user) return null;

  // Define navigation items based on user role
  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      {
        id: 'home',
        label: 'الرئيسية',
        href: '/',
        icon: <HomeIcon />,
        matchPaths: ['/'],
      },
      {
        id: 'courses',
        label: 'الدورات',
        href: '/courses',
        icon: <CoursesIcon />,
        matchPaths: ['/courses'],
      },
    ];

    const role = user.role?.toUpperCase();
    
    if (role === 'STUDENT') {
      return [
        ...baseItems,
        {
          id: 'dashboard',
          label: 'زادي',
          href: '/dashboard',
          icon: <DashboardIcon />,
          matchPaths: ['/dashboard'],
        },
        {
          id: 'exams',
          label: 'الامتحانات',
          href: '/dashboard/exams',
          icon: <ExamsIcon />,
          badge: activeExamsCount > 0 ? activeExamsCount : undefined,
          matchPaths: ['/dashboard/exams'],
        },
        {
          id: 'grades',
          label: 'الدرجات',
          href: '/dashboard/grades',
          icon: <GradesIcon />,
          matchPaths: ['/dashboard/grades'],
        },
      ];
    }

    if (role === 'TEACHER') {
      return [
        ...baseItems,
        {
          id: 'dashboard',
          label: 'لوحة التحكم',
          href: '/teacher',
          icon: <DashboardIcon />,
          matchPaths: ['/teacher'],
        },
        {
          id: 'questions',
          label: 'الأسئلة',
          href: '/teacher/questions',
          icon: <ExamsIcon />,
          matchPaths: ['/teacher/questions'],
        },
        {
          id: 'homework',
          label: 'الواجبات',
          href: '/teacher/homework',
          icon: <HomeworkIcon />,
          matchPaths: ['/teacher/homework'],
        },
      ];
    }

    if (role === 'ADMIN') {
      return [
        ...baseItems,
        {
          id: 'admin-dashboard',
          label: 'لوحة التحكم',
          href: '/admin',
          icon: <DashboardIcon />,
          matchPaths: ['/admin'],
        },
        {
          id: 'admin-users',
          label: 'المستخدمين',
          href: '/admin/users',
          icon: <ProfileIcon />,
          matchPaths: ['/admin/users'],
        },
        {
          id: 'admin-courses',
          label: 'إدارة الدورات',
          href: '/admin/courses',
          icon: <CoursesIcon />,
          matchPaths: ['/admin/courses'],
        },
      ];
    }

    return baseItems;
  };

  const navItems = getNavItems();

  // Get all match paths from all nav items, sorted by length (longest first)
  const allMatchPaths = navItems
    .flatMap(item => item.matchPaths || [item.href])
    .sort((a, b) => b.length - a.length);

  const isActive = (item: NavItem): boolean => {
    // Exact match for home
    if (item.id === 'home') {
      return pathname === '/';
    }
    
    const itemPaths = item.matchPaths || [item.href];
    
    // Find the most specific (longest) match path that matches the current pathname
    const bestMatch = allMatchPaths.find(path => {
      if (path === '/') return pathname === '/';
      return pathname === path || pathname.startsWith(path + '/');
    });
    
    // This item is active only if it owns the best (most specific) match
    return itemPaths.includes(bestMatch || '');
  };

  return (
    <nav 
      className="bottom-nav" 
      role="navigation" 
      aria-label="التنقل السريع"
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = isActive(item);
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`bottom-nav-item flex-1 ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
              aria-label={item.badge ? `${item.label} (${item.badge} جديد)` : item.label}
            >
              {item.icon}
              <span className="bottom-nav-label">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="bottom-nav-badge" aria-hidden="true">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Hook to check if bottom nav should be visible
 * Useful for adding padding to content
 */
export function useBottomNavVisible(): boolean {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('user');
    setIsVisible(!!user);

    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 769);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isVisible && isMobile;
}
