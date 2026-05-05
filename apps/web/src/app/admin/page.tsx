'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { 
  BookIcon, 
  UsersIcon, 
  CheckIcon, 
  TeacherIcon, 
  GraduateIcon, 
  FolderIcon, 
  PlusIcon, 
  UserIcon,
  ArrowRightIcon 
} from '@/components/Icons';
import PageLoading from '@/components/PageLoading';

interface Stats {
  courses: number;
  users: number;
  enrollments: number;
  teachers: number;
  students: number;
  categories: number;
}

interface RecentActivity {
  type: string;
  message: string;
  time: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    courses: 0,
    users: 0,
    enrollments: 0,
    teachers: 0,
    students: 0,
    categories: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentCourses, setRecentCourses] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [coursesRes, usersRes, enrollmentsRes, categoriesRes] = await Promise.all([
        api.get('/courses/public').catch(() => ({ data: { data: [], pagination: {} } })),
        api.get('/users').catch(() => ({ data: [] })),
        api.get('/enrollments').catch(() => ({ data: [] })),
        api.get('/categories').catch(() => ({ data: [] })),
      ]);

      // Handle paginated response from /courses/public
      const coursesData = coursesRes.data;
      const courses = coursesData?.data ?? coursesData ?? [];
      const users = usersRes.data || [];
      const enrollments = enrollmentsRes.data || [];
      const categories = categoriesRes.data || [];

      const teachers = users.filter((u: any) => u.role === 'TEACHER').length;
      const students = users.filter((u: any) => u.role === 'STUDENT').length;

      setStats({
        courses: courses.length,
        users: users.length,
        enrollments: enrollments.length,
        teachers,
        students,
        categories: categories.length,
      });

      setRecentCourses(courses.slice(0, 5));
      setRecentUsers(users.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && recentCourses.length === 0) {
    return (
      <PageLoading 
        title="لوحة التحكم" 
        icon={<BookIcon className="text-white" size={20} />}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">لوحة التحكم</h1>
          <p className="text-white/70">إدارة شاملة لمنصة زاد الهداية التعليمية</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Primary Stats - Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Link href="/admin/courses" className="group bg-white rounded-xl p-5 shadow-sm border border-stone-100 hover:shadow-md hover:border-[#c9a227]/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-stone-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-stone-200 transition-colors">
                <BookIcon className="text-stone-600" size={26} />
              </div>
              <div className="flex-1">
                <p className="text-3xl font-bold text-stone-800">{stats.courses}</p>
                <p className="text-stone-500 text-sm">الدورات</p>
              </div>
              <ArrowRightIcon className="text-stone-300 group-hover:text-[#c9a227] transition-colors" size={20} />
            </div>
          </Link>

          <Link href="/admin/users" className="group bg-white rounded-xl p-5 shadow-sm border border-stone-100 hover:shadow-md hover:border-[#c9a227]/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-stone-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-stone-200 transition-colors">
                <UsersIcon className="text-stone-600" size={26} />
              </div>
              <div className="flex-1">
                <p className="text-3xl font-bold text-stone-800">{stats.users}</p>
                <p className="text-stone-500 text-sm">المستخدمين</p>
              </div>
              <ArrowRightIcon className="text-stone-300 group-hover:text-[#c9a227] transition-colors" size={20} />
            </div>
          </Link>

          <Link href="/admin/enrollments" className="group bg-white rounded-xl p-5 shadow-sm border border-stone-100 hover:shadow-md hover:border-[#c9a227]/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-stone-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-stone-200 transition-colors">
                <CheckIcon className="text-stone-600" size={26} />
              </div>
              <div className="flex-1">
                <p className="text-3xl font-bold text-stone-800">{stats.enrollments}</p>
                <p className="text-stone-500 text-sm">التسجيلات</p>
              </div>
              <ArrowRightIcon className="text-stone-300 group-hover:text-[#c9a227] transition-colors" size={20} />
            </div>
          </Link>
        </div>

        {/* Secondary Stats - Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-stone-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center shrink-0">
                <TeacherIcon className="text-stone-600" size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">{stats.teachers}</p>
                <p className="text-stone-500 text-sm">المدرسين</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-stone-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center shrink-0">
                <GraduateIcon className="text-stone-600" size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">{stats.students}</p>
                <p className="text-stone-500 text-sm">الطلاب</p>
              </div>
            </div>
          </div>

          <Link href="/admin/categories" className="group bg-white rounded-xl p-5 shadow-sm border border-stone-100 hover:shadow-md hover:border-[#c9a227]/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-stone-200 transition-colors">
                <FolderIcon className="text-stone-600" size={22} />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold text-stone-800">{stats.categories}</p>
                <p className="text-stone-500 text-sm">الفئات</p>
              </div>
              <ArrowRightIcon className="text-stone-300 group-hover:text-[#c9a227] transition-colors" size={18} />
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6 mb-6">
          <h2 className="text-lg font-bold text-stone-800 mb-4">إجراءات سريعة</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/admin/courses/create"
              className="group flex items-center gap-3 p-4 bg-stone-100 text-stone-700 rounded-xl hover:bg-stone-200 transition-all"
            >
              <div className="w-10 h-10 bg-stone-200 rounded-lg flex items-center justify-center group-hover:bg-stone-300 transition-colors">
                <PlusIcon size={18} />
              </div>
              <span className="font-medium">إنشاء دورة جديدة</span>
            </Link>
            <Link
              href="/admin/users?action=create"
              className="group flex items-center gap-3 p-4 bg-stone-100 text-stone-700 rounded-xl hover:bg-stone-200 transition-all"
            >
              <div className="w-10 h-10 bg-stone-200 rounded-lg flex items-center justify-center group-hover:bg-stone-300 transition-colors">
                <UserIcon size={18} />
              </div>
              <span className="font-medium">إضافة مستخدم</span>
            </Link>
            <Link
              href="/admin/categories"
              className="group flex items-center gap-3 p-4 bg-stone-100 text-stone-700 rounded-xl hover:bg-stone-200 transition-all"
            >
              <div className="w-10 h-10 bg-stone-200 rounded-lg flex items-center justify-center group-hover:bg-stone-300 transition-colors">
                <FolderIcon size={18} />
              </div>
              <span className="font-medium">إدارة الفئات</span>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Courses */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-stone-800">أحدث الدورات</h2>
              <Link href="/admin/courses" className="text-[#1a3a2f] text-sm font-medium hover:text-[#c9a227] transition-colors">
                عرض الكل
              </Link>
            </div>
            {recentCourses.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BookIcon className="text-stone-400" size={20} />
                </div>
                <p className="text-stone-400">لا توجد دورات</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCourses.map((course) => (
                  <Link key={course.id} href={`/admin/courses/${course.id}/edit`} className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors">
                    <div className="w-10 h-10 bg-[#1a3a2f] rounded-lg flex items-center justify-center text-white font-semibold text-sm shrink-0">
                      {course.title.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-stone-800 truncate text-sm">{course.title}</h3>
                      <p className="text-xs text-stone-500 truncate">{course.category?.title || 'بدون فئة'}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium shrink-0 ${
                      course.status === 'PUBLISHED' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-stone-200 text-stone-600'
                    }`}>
                      {course.status === 'PUBLISHED' ? 'منشور' : 'مسودة'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Users */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-stone-800">أحدث المستخدمين</h2>
              <Link href="/admin/users" className="text-[#1a3a2f] text-sm font-medium hover:text-[#c9a227] transition-colors">
                عرض الكل
              </Link>
            </div>
            {recentUsers.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <UsersIcon className="text-stone-400" size={20} />
                </div>
                <p className="text-stone-400">لا يوجد مستخدمين</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#1a3a2f] to-[#2d5a4a] rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-stone-800 truncate text-sm">{user.name}</h3>
                      <p className="text-xs text-stone-500 truncate">{user.email}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium shrink-0 ${
                      user.role === 'ADMIN' 
                        ? 'bg-violet-100 text-violet-700'
                        : user.role === 'TEACHER'
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {user.role === 'ADMIN' ? 'مشرف' : user.role === 'TEACHER' ? 'مدرس' : 'طالب'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
