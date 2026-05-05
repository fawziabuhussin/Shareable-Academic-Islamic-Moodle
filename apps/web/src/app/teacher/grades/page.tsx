'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { navigateTo } from '@/lib/navigation';
import { StarIcon } from '@/components/Icons';
import PageLoading from '@/components/PageLoading';
import { BookOpen, LayoutGrid } from 'lucide-react';

export default function TeacherGradesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCourses = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) { navigateTo('/login', router); return; }
      const user = JSON.parse(userStr);
      if (user.role !== 'TEACHER' && user.role !== 'ADMIN') { navigateTo('/dashboard', router); return; }
      const res = await api.get('/courses/teacher/my-courses');
      setCourses(res.data || []);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoading title="الدرجات" icon={<StarIcon className="text-white" size={20} />} />;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <StarIcon className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold">إدارة الدرجات</h1>
              <p className="text-white/70 text-sm">اختر دورة لعرض واعتماد درجات الطلاب</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* All courses overview entry */}
        <Link
          href="/teacher/grades/all"
          className="flex items-center justify-between px-5 py-4 bg-gradient-to-l from-[#1a3a2f] to-[#1f4a3d] text-white rounded-xl shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center">
              <LayoutGrid size={18} />
            </div>
            <div>
              <span className="font-bold text-base">نظرة شاملة — جميع الدورات</span>
              <p className="text-white/70 text-xs mt-0.5">عرض درجات جميع الطلاب في كل الدورات في جدول واحد</p>
            </div>
          </div>
          <span className="text-sm font-medium shrink-0">عرض ←</span>
        </Link>

        {courses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center">
            <p className="text-stone-500">لا توجد دورات متاحة حالياً</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 divide-y divide-stone-100">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/teacher/grades/${course.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BookOpen size={18} className="text-[#1a3a2f] shrink-0" />
                  <span className="font-medium text-stone-800">{course.title}</span>
                  {course.category?.title && (
                    <span className="text-xs text-stone-400 hidden sm:inline">— {course.category.title}</span>
                  )}
                </div>
                <span className="text-sm text-[#1a3a2f] font-medium shrink-0">عرض الدرجات ←</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
