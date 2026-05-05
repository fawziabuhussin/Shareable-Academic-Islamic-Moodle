'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate, formatTime } from '@/lib/utils';
import { CheckCircleIcon, HomeworkIcon, CalendarIcon, BookIcon } from '@/components/Icons';
import { HomeworkCardSkeleton } from '@/components/Skeleton';

interface Homework {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
  course: { title: string; id: string };
  submissions: Array<{ id: string; score: number; feedback: string }>;
}

export default function StudentHomeworkPage() {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomeworks();
  }, []);

  const loadHomeworks = async () => {
    try {
      const enrollmentsRes = await api.get('/enrollments/my-enrollments').catch(() => ({ data: [] }));
      const enrollments = enrollmentsRes.data || [];
      const courses = enrollments.map((e: any) => e.course).filter((c: any) => c);

      if (courses.length === 0) {
        setHomeworks([]);
        setLoading(false);
        return;
      }

      const allHomeworks: Homework[] = [];
      for (const course of courses) {
        try {
          const hwRes = await api.get(`/homework/course/${course.id}`);
          if (hwRes.data && Array.isArray(hwRes.data)) {
            allHomeworks.push(...hwRes.data);
          }
        } catch (e) {
          // Skip if no homeworks or error
          console.log(`No homeworks for course ${course.id}`);
        }
      }

      setHomeworks(allHomeworks);
    } catch (error: any) {
      console.error('Failed to load homeworks:', error);
      setHomeworks([]);
    } finally {
      setLoading(false);
    }
  };

  const getHomeworkStatus = (homework: Homework) => {
    const now = new Date();
    const due = new Date(homework.dueDate);
    const hasSubmission = homework.submissions && homework.submissions.length > 0;
    const isOverdue = now > due && !hasSubmission;

    if (hasSubmission) return { status: 'submitted', label: 'تم التسليم', color: 'bg-emerald-50 text-emerald-700' };
    if (isOverdue) return { status: 'overdue', label: 'متأخر', color: 'bg-red-50 text-red-700' };
    return { status: 'pending', label: 'قيد الانتظار', color: 'bg-amber-50 text-amber-700' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg animate-pulse" />
              <div>
                <div className="h-6 bg-white/20 rounded w-24 mb-1 animate-pulse" />
                <div className="h-4 bg-white/10 rounded w-16 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Homework Cards Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <HomeworkCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <HomeworkIcon className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold">الواجبات</h1>
              <p className="text-white/70 text-sm">{homeworks.length} واجب</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {homeworks.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HomeworkIcon className="text-stone-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">لا توجد واجبات متاحة</h3>
            <p className="text-stone-500 mb-6">سجل في دورات للوصول إلى الواجبات</p>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a3a2f] text-white rounded-xl font-bold hover:bg-[#143026] transition"
            >
              <BookIcon size={18} />
              تصفح الدورات
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {homeworks.map((homework) => {
              const hwStatus = getHomeworkStatus(homework);
              const hasSubmission = homework.submissions && homework.submissions.length > 0;
              const submission = hasSubmission ? homework.submissions[0] : null;

              return (
                <div key={homework.id} className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold mb-1 text-stone-800">{homework.title}</h2>
                      <p className="text-stone-500">{homework.course.title}</p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg font-medium text-sm ${hwStatus.color}`}>
                      {hwStatus.label}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-stone-600 leading-relaxed">{homework.description}</p>
                  </div>

                  <div className="space-y-2 mb-6 text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-stone-100">
                      <span className="text-stone-500 flex items-center gap-2">
                        <CalendarIcon size={14} /> تاريخ الاستحقاق
                      </span>
                      <span className="font-medium text-stone-800">{formatDate(homework.dueDate)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-stone-100">
                      <span className="text-stone-500">الوقت</span>
                      <span className="font-medium text-stone-800">
                        {formatTime(homework.dueDate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-stone-100">
                      <span className="text-stone-500">الدرجة الكاملة</span>
                      <span className="font-medium text-stone-800">{homework.maxScore}</span>
                    </div>
                    {submission && submission.score !== null && (
                      <div className="flex justify-between items-center pt-3">
                        <span className="font-bold text-stone-800">درجتك</span>
                        <span className="text-xl font-bold text-emerald-600">
                          {submission.score} / {homework.maxScore}
                        </span>
                      </div>
                    )}
                    {submission && submission.feedback && (
                      <div className="pt-3">
                        <p className="font-medium text-stone-700 mb-2">ملاحظات المدرس:</p>
                        <p className="text-stone-600 bg-stone-50 p-3 rounded-lg">{submission.feedback}</p>
                      </div>
                    )}
                  </div>

                  {!hasSubmission && (
                    <Link
                      href={`/dashboard/homework/${homework.id}/submit`}
                      className="block w-full py-3 bg-[#1a3a2f] text-white rounded-lg font-bold text-center hover:bg-[#143026] transition"
                    >
                      {hwStatus.status === 'overdue' ? 'تسليم متأخر' : 'تسليم الواجب'}
                    </Link>
                  )}

                  {hasSubmission && (
                    <div className="py-3 bg-emerald-50 text-emerald-700 rounded-lg text-center font-medium flex items-center justify-center gap-2">
                      <CheckCircleIcon size={18} /> تم تسليم الواجب
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

