'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { BookIcon, PlusIcon, GraduateIcon, ExamIcon, HomeworkIcon } from '@/components/Icons';
import PageLoading from '@/components/PageLoading';
import { CourseCoverImage } from '@/components/OptimizedImage';

interface Course {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  status: string;
  _count: { enrollments: number };
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Try to get user from localStorage first
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const cachedUser = JSON.parse(userStr);
          if (cachedUser.role === 'TEACHER' || cachedUser.role === 'ADMIN') {
            setUser(cachedUser);
          }
        } catch (e) {
          // Invalid cached user
        }
      }

      const [userRes, coursesRes] = await Promise.all([
        api.get('/auth/me').catch(() => {
          // If API fails, return cached user
          const userStr = localStorage.getItem('user');
          if (userStr) {
            try {
              return { data: JSON.parse(userStr) };
            } catch (e) {
              throw new Error('No user data');
            }
          }
          throw new Error('No user data');
        }),
        api.get('/courses/teacher/my-courses'),
      ]);
      
      if (userRes.data) {
        setUser(userRes.data);
        localStorage.setItem('user', JSON.stringify(userRes.data));
      }
      setCourses(coursesRes.data || []);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      // Don't redirect if we have cached user
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const cachedUser = JSON.parse(userStr);
          if (cachedUser.role === 'TEACHER' || cachedUser.role === 'ADMIN') {
            setUser(cachedUser);
            // Try to load courses only
            try {
              const coursesRes = await api.get('/courses/teacher/my-courses');
              setCourses(coursesRes.data || []);
            } catch (e) {
              // Courses failed, but keep user
            }
            setLoading(false);
            return;
          }
        } catch (e) {
          // Invalid cached user
        }
      }
      // Only redirect if no valid cached user
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading && courses.length === 0) {
    return (
      <PageLoading 
        title="لوحة المعلم" 
        icon={<BookIcon className="text-white" size={20} />}
      />
    );
  }

  const totalStudents = courses.reduce((sum, course) => sum + course._count.enrollments, 0);
  const publishedCourses = courses.filter(c => c.status === 'PUBLISHED').length;

  return (
    <div className="bg-stone-50 min-h-screen">
      {/* Welcome Header */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">مرحباً، {user?.name}</h1>
              <p className="text-white/70">إدارة دوراتك ومتابعة تقدم طلابك</p>
            </div>
            <Link
              href="/teacher/courses/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#c9a227] text-white rounded-xl font-bold hover:bg-[#b08f20] transition-all shadow-lg hover:shadow-xl"
            >
              <PlusIcon size={20} />
              إنشاء دورة جديدة
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-stone-100 rounded-lg flex items-center justify-center">
                <BookIcon className="text-stone-600" size={20} />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-stone-800">{courses.length}</p>
                <p className="text-xs md:text-sm text-stone-500">إجمالي الدورات</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-stone-100 rounded-lg flex items-center justify-center">
                <BookIcon className="text-stone-600" size={20} />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-stone-800">{publishedCourses}</p>
                <p className="text-xs md:text-sm text-stone-500">دورات منشورة</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-stone-100 rounded-lg flex items-center justify-center">
                <GraduateIcon className="text-stone-600" size={20} />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-stone-800">{totalStudents}</p>
                <p className="text-xs md:text-sm text-stone-500">إجمالي الطلاب</p>
              </div>
            </div>
          </div>
          <Link href="/teacher/exams" className="group bg-white rounded-xl p-4 md:p-6 shadow-sm border border-stone-100 hover:border-[#c9a227]/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-stone-100 rounded-lg flex items-center justify-center group-hover:bg-stone-200 transition-colors">
                <ExamIcon className="text-stone-600" size={20} />
              </div>
              <div>
                <p className="text-lg font-bold text-stone-800">الامتحانات</p>
                <p className="text-xs md:text-sm text-stone-500">إدارة</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-stone-800">دوراتي</h2>
          <Link href="/teacher/courses" className="text-[#1a3a2f] text-sm font-medium hover:underline">
            عرض الكل
          </Link>
        </div>

        {/* Courses Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.length === 0 ? (
            <div className="col-span-full">
              <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-12 text-center">
                <div className="w-16 h-16 bg-[#1a3a2f]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookIcon className="text-[#1a3a2f]" size={32} />
                </div>
                <h3 className="text-xl font-bold text-stone-800 mb-2">لم تنشئ أي دورة بعد</h3>
                <p className="text-stone-500 mb-6">ابدأ بإنشاء دورتك الأولى وشارك علمك مع الطلاب</p>
                <Link
                  href="/teacher/courses/create"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a3a2f] text-white rounded-xl font-bold hover:bg-[#143026] transition"
                >
                  <PlusIcon size={18} />
                  إنشاء دورة جديدة
                </Link>
              </div>
            </div>
          ) : (
            courses.map((course) => (
              <Link
                key={course.id}
                href={`/teacher/courses/${course.id}`}
                className="group bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 border border-stone-100"
              >
                <div className="h-40 md:h-48 relative">
                  <CourseCoverImage src={course.coverImage} alt={course.title} />
                  {/* Status Badge */}
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
                  <h3 className="text-lg font-bold text-stone-800 mb-3 group-hover:text-[#1a3a2f] transition-colors line-clamp-1">
                    {course.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-stone-500">
                      <GraduateIcon size={16} />
                      <span className="text-sm">{course._count.enrollments} طالب</span>
                    </div>
                    <span className="text-[#1a3a2f] text-sm font-medium group-hover:translate-x-[-4px] transition-transform">
                      إدارة ←
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Quick Actions */}
        {courses.length > 0 && (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/teacher/exams" className="group bg-white rounded-xl p-4 shadow-sm border border-stone-100 hover:border-[#c9a227]/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center group-hover:bg-stone-200 transition-colors">
                  <ExamIcon className="text-stone-600" size={18} />
                </div>
                <span className="font-medium text-stone-700">الامتحانات</span>
              </div>
            </Link>
            <Link href="/teacher/homework" className="group bg-white rounded-xl p-4 shadow-sm border border-stone-100 hover:border-[#c9a227]/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center group-hover:bg-stone-200 transition-colors">
                  <HomeworkIcon className="text-stone-600" size={18} />
                </div>
                <span className="font-medium text-stone-700">الواجبات</span>
              </div>
            </Link>
            <Link href="/teacher/grades" className="group bg-white rounded-xl p-4 shadow-sm border border-stone-100 hover:border-[#c9a227]/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center group-hover:bg-stone-200 transition-colors">
                  <GraduateIcon className="text-stone-600" size={18} />
                </div>
                <span className="font-medium text-stone-700">التقييمات</span>
              </div>
            </Link>
            <Link href="/teacher/courses/create" className="group bg-white rounded-xl p-4 shadow-sm border border-stone-100 hover:border-[#c9a227]/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center group-hover:bg-stone-200 transition-colors">
                  <PlusIcon className="text-stone-600" size={18} />
                </div>
                <span className="font-medium text-stone-700">دورة جديدة</span>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

