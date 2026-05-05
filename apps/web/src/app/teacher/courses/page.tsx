'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { BookIcon, PlusIcon, SearchIcon, GraduateIcon } from '@/components/Icons';
import { navigateTo } from '@/lib/navigation';
import PageLoading from '@/components/PageLoading';
import { CourseCoverImage } from '@/components/OptimizedImage';

interface Course {
  id: string;
  title: string;
  description: string | null;
  coverImage?: string;
  status: string;
  price?: number;
  category: { title: string };
  _count: { enrollments: number };
  createdAt: string;
}

export default function TeacherCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    try {
      // Try to get user from localStorage first
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const cachedUser = JSON.parse(userStr);
          if (cachedUser.role === 'TEACHER' || cachedUser.role === 'ADMIN') {
            setUser(cachedUser);
            loadCourses();
            return;
          }
        } catch (e) {
          // Invalid cached user
        }
      }

      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigateTo('/login', router);
        return;
      }

      const userRes = await api.get('/auth/me');
      const userData = userRes.data;
      
      if (userData.role !== 'TEACHER' && userData.role !== 'ADMIN') {
        navigateTo('/dashboard', router);
        return;
      }

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      loadCourses();
    } catch (error: any) {
      // Try to use cached user
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const cachedUser = JSON.parse(userStr);
          if (cachedUser.role === 'TEACHER' || cachedUser.role === 'ADMIN') {
            setUser(cachedUser);
            loadCourses();
            return;
          }
        } catch (e) {
          // Invalid cached user
        }
      }
      navigateTo('/login', router);
    }
  };

  const loadCourses = async () => {
    try {
      const response = await api.get('/courses/teacher/my-courses');
      setCourses(response.data || []);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase()) ||
                         (course.description || '').toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  if (loading && courses.length === 0) {
    return <PageLoading title="الدورات" icon={<BookIcon className="text-white" size={20} />} />;
  }

  const publishedCount = courses.filter(c => c.status === 'PUBLISHED').length;
  const totalStudents = courses.reduce((sum, c) => sum + c._count.enrollments, 0);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <BookIcon className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold">دوراتي</h1>
                <p className="text-white/70 text-sm">{courses.length} دورة</p>
              </div>
            </div>
            <Link
              href="/teacher/courses/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#c9a227] text-white rounded-lg font-bold hover:bg-[#b08f20] transition"
            >
              <PlusIcon size={18} />
              دورة جديدة
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center">
                <BookIcon className="text-stone-600" size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">{courses.length}</p>
                <p className="text-xs text-stone-500">إجمالي</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center">
                <BookIcon className="text-stone-600" size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">{publishedCount}</p>
                <p className="text-xs text-stone-500">منشورة</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center">
                <GraduateIcon className="text-stone-600" size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">{totalStudents}</p>
                <p className="text-xs text-stone-500">طلاب</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4 mb-6">
          <div className="relative">
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input
              type="text"
              placeholder="ابحث عن دورة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] text-stone-800 bg-white"
            />
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.length === 0 ? (
            <div className="col-span-full">
              <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookIcon className="text-stone-600" size={32} />
                </div>
                <h3 className="text-xl font-bold text-stone-800 mb-2">
                  {search ? 'لا توجد دورات تطابق البحث' : 'لم تنشئ أي دورة بعد'}
                </h3>
                <p className="text-stone-500 mb-6">ابدأ بإنشاء دورتك الأولى</p>
                {!search && (
                  <Link
                    href="/teacher/courses/create"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a3a2f] text-white rounded-xl font-bold hover:bg-[#143026] transition"
                  >
                    <PlusIcon size={18} />
                    إنشاء دورة جديدة
                  </Link>
                )}
              </div>
            </div>
          ) : (
            filteredCourses.map((course) => (
              <Link
                key={course.id}
                href={`/teacher/courses/${course.id}/edit`}
                className="group bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 border border-stone-100"
              >
                <div className="h-40 relative">
                  <CourseCoverImage src={course.coverImage} alt={course.title} />
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      course.status === 'PUBLISHED' 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-stone-600 text-white'
                    }`}>
                      {course.status === 'PUBLISHED' ? 'منشور' : 'مسودة'}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold mb-2 text-stone-800 group-hover:text-[#1a3a2f] transition-colors line-clamp-1">{course.title}</h3>
                  {course.description && <p className="text-stone-500 text-sm mb-4 line-clamp-2">{course.description}</p>}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded">{course.category.title}</span>
                    <span className="text-stone-600 text-sm flex items-center gap-1">
                      <GraduateIcon size={14} />
                      {course._count.enrollments} طالب
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

