'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { ExamIcon, ClockIcon, EditIcon, UsersIcon } from '@/components/Icons';
import { navigateTo } from '@/lib/navigation';
import PageLoading from '@/components/PageLoading';
import { Pagination, PaginationInfo } from '@/components/Pagination';

const ITEMS_PER_PAGE = 10;

interface Exam {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  startDate: string;
  endDate: string;
  maxScore: number;
  passingScore: number;
  maxAttempts?: number;
  retakeScorePercent?: number;
  course: { id: string; title: string };
  _count: { attempts: number; questions: number };
}

export default function TeacherExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);

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
            loadData();
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
      loadData();
    } catch (error: any) {
      // Try to use cached user
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const cachedUser = JSON.parse(userStr);
          if (cachedUser.role === 'TEACHER' || cachedUser.role === 'ADMIN') {
            setUser(cachedUser);
            loadData();
            return;
          }
        } catch (e) {
          // Invalid cached user
        }
      }
      navigateTo('/login', router);
    }
  };

  const loadData = async () => {
    try {
      const coursesRes = await api.get('/courses/teacher/my-courses');
      const myCourses = coursesRes.data || [];
      setCourses(myCourses);
      
      // Load exams for teacher's courses
      const allExams: Exam[] = [];
      for (const course of myCourses) {
        try {
          const examRes = await api.get(`/exams/course/${course.id}`);
          const examsWithCourse = (examRes.data || []).map((exam: any) => ({
            ...exam,
            course: exam.course || { id: course.id, title: course.title },
          }));
          allExams.push(...examsWithCourse);
        } catch (error) {
          console.error(`Failed to load exams for course ${course.id}:`, error);
        }
      }
      setExams(allExams);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Client-side pagination
  const totalPages = Math.ceil(exams.length / ITEMS_PER_PAGE);
  const paginatedExams = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return exams.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [exams, currentPage]);

  // Reset to page 1 if current page exceeds total pages after data changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [exams.length, totalPages, currentPage]);

  if (loading && exams.length === 0) {
    return <PageLoading title="الامتحانات" icon={<ExamIcon className="text-white" size={20} />} />;
  }

  const totalAttempts = exams.reduce((sum, e) => sum + (e._count?.attempts || 0), 0);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <ExamIcon className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold">الامتحانات</h1>
              <p className="text-white/70 text-sm">{exams.length} امتحان</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center">
                <ExamIcon className="text-stone-600" size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">{exams.length}</p>
                <p className="text-xs text-stone-500">إجمالي الامتحانات</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center">
                <UsersIcon className="text-stone-600" size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">{totalAttempts}</p>
                <p className="text-xs text-stone-500">إجمالي التقديمات</p>
              </div>
            </div>
          </div>
        </div>

        {exams.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExamIcon className="text-stone-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">لا توجد امتحانات بعد</h3>
            <p className="text-stone-500">قم بإنشاء دورة وإضافة امتحانات إليها</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">الامتحان</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase hidden md:table-cell">الدورة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase hidden sm:table-cell">المدة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase hidden lg:table-cell">الدرجة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase hidden sm:table-cell">الإعادة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">التقديمات</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginatedExams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <h3 className="font-medium text-stone-800">{exam.title}</h3>
                          {exam.description && (
                            <p className="text-sm text-stone-500 mt-1 line-clamp-1">{exam.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-stone-600 hidden md:table-cell">
                        {exam.course?.title || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-stone-600 hidden sm:table-cell">
                        <span className="flex items-center gap-1">
                          <ClockIcon size={14} />
                          {exam.durationMinutes} د
                        </span>
                      </td>
                      <td className="px-6 py-4 text-stone-600 hidden lg:table-cell">
                        {exam.maxScore} ({exam.passingScore} للنجاح)
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        {(() => {
                          const max = exam.maxAttempts ?? 2;
                          const pct = exam.retakeScorePercent ?? 75;
                          if (max === 1) {
                            return (
                              <div className="space-y-1">
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-50 text-red-600">
                                  بدون إعادة
                                </span>
                                <p className="text-[11px] text-stone-400">محاولة واحدة فقط</p>
                              </div>
                            );
                          }
                          return (
                            <div className="space-y-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${max === 0 ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}`}>
                                {max === 0 ? 'حتى النجاح' : `${max} محاولات`}
                              </span>
                              <p className="text-[11px] text-stone-400">{pct}% من الدرجة</p>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-stone-800 font-medium">
                        {exam._count?.attempts || 0}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link
                            href={`/teacher/exams/${exam.id}`}
                            className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition text-sm font-medium"
                          >
                            تعديل
                          </Link>
                          <Link
                            href={`/teacher/exams/${exam.id}/attempts`}
                            className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition text-sm font-medium"
                          >
                            التقديمات
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {exams.length > ITEMS_PER_PAGE && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <PaginationInfo
              currentPage={currentPage}
              limit={ITEMS_PER_PAGE}
              total={exams.length}
              itemName="امتحان"
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

