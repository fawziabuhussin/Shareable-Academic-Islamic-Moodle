'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import api from '@/lib/api';
import { CheckCircleIcon, ExamIcon, ClockIcon, BookIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/Icons';
import { ExamCardSkeleton, SearchBarSkeleton } from '@/components/Skeleton';
import { shouldShowSkeleton } from '@/lib/swr-config';
import { formatDate, formatTime, formatDateTime } from '@/lib/utils';

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
  course: { title: string; id: string };
  attempts: Array<{
    id: string;
    score: number | null;
    attemptNumber?: number;
    isRetake?: boolean;
    status?: string;
  }>;
}

// SWR fetcher
const fetcher = async (url: string) => {
  const response = await api.get(url);
  return response.data;
};

// Items per page
const ITEMS_PER_PAGE = 6;

export default function StudentExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const hasLoadedOnce = useRef(false);

  // Use SWR to fetch enrollments with caching
  // keepPreviousData prevents flash on navigation
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useSWR(
    '/enrollments/my-enrollments',
    fetcher,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      dedupingInterval: 10000,
      onError: () => [],
    }
  );

  // Extract courses from enrollments
  const courses = useMemo(() => {
    return enrollments.map((e: any) => e.course).filter((c: any) => c);
  }, [enrollments]);

  // Load exams for all courses IN PARALLEL (reduces waterfall)
  useEffect(() => {
    if (enrollmentsLoading) return;
    
    if (courses.length === 0) {
      setExams([]);
      setLoading(false);
      hasLoadedOnce.current = true;
      return;
    }

    const loadExamsParallel = async () => {
      try {
        // Load exams for ALL courses in parallel using Promise.allSettled
        const examPromises = courses.map((course: any) =>
          api.get(`/exams/course/${course.id}`)
            .then(res => ({
              courseId: course.id,
              courseTitle: course.title || 'N/A',
              exams: res.data || [],
            }))
            .catch(() => ({
              courseId: course.id,
              courseTitle: course.title || 'N/A',
              exams: [],
            }))
        );

        const results = await Promise.all(examPromises);

        // Flatten all exams with course info
        const allExams: Exam[] = [];
        for (const result of results) {
          if (result.exams && Array.isArray(result.exams)) {
            const examsWithCourse = result.exams.map((exam: any) => ({
              ...exam,
              course: { title: result.courseTitle, id: result.courseId },
            }));
            allExams.push(...examsWithCourse);
          }
        }

        setExams(allExams);
      } catch (error: any) {
        console.error('Failed to load exams:', error);
        setExams([]);
      } finally {
        setLoading(false);
        hasLoadedOnce.current = true;
      }
    };

    loadExamsParallel();
  }, [courses, enrollmentsLoading]);

  const getExamStatus = (exam: Exam) => {
    const now = new Date();
    const start = new Date(exam.startDate);
    const end = new Date(exam.endDate);
    const hasAttempt = exam.attempts && exam.attempts.length > 0;

    if (hasAttempt) {
      const latestAttempt = exam.attempts[0]; // ordered by attemptNumber desc
      const score = latestAttempt.score;

      // Check if failed (score < passingScore)
      if (score !== null && score < exam.passingScore && latestAttempt.status !== 'PENDING') {
        return { status: 'failed', label: 'راسب', color: 'bg-red-50 text-red-700' };
      }

      return { status: 'completed', label: 'مكتمل', color: 'bg-emerald-50 text-emerald-700' };
    }
    if (now < start) return { status: 'upcoming', label: 'قادم', color: 'bg-sky-50 text-sky-700' };
    if (now >= start && now <= end) return { status: 'active', label: 'متاح الآن', color: 'bg-amber-50 text-amber-700' };
    return { status: 'not-taken', label: 'لم يتقدم', color: 'bg-stone-100 text-stone-500' };
  };

  /**
   * Check if a failed student can retake this exam
   * Conditions: failed + within time window + max 2 attempts + not pending
   */
  const canRetakeExam = (exam: Exam) => {
    if (!exam.attempts || exam.attempts.length === 0) return false;
    const latestAttempt = exam.attempts[0];
    const now = new Date();
    const start = new Date(exam.startDate);
    const end = new Date(exam.endDate);
    const withinWindow = now >= start && now <= end;
    const attemptCount = latestAttempt.attemptNumber ?? exam.attempts.length;
    const failed = latestAttempt.score !== null
      && latestAttempt.score < exam.passingScore
      && latestAttempt.status !== 'PENDING';
    const maxAttempts = exam.maxAttempts ?? 2;
    return failed && withinWindow && (maxAttempts === 0 || attemptCount < maxAttempts);
  };

  // Filter exams based on search and status
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      // Search filter
      const matchesSearch = 
        exam.title.toLowerCase().includes(search.toLowerCase()) ||
        exam.course.title.toLowerCase().includes(search.toLowerCase());
      
      // Status filter
      const status = getExamStatus(exam).status;
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [exams, search, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredExams.length / ITEMS_PER_PAGE);
  const paginatedExams = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredExams.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredExams, currentPage]);

  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  // Only show skeleton on truly fresh loads - not navigation between pages
  const showSkeleton = loading && !hasLoadedOnce.current && exams.length === 0;

  if (showSkeleton) {
    return (
      <div className="min-h-screen bg-stone-50">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg animate-pulse" />
              <div>
                <div className="h-6 bg-white/20 rounded w-32 mb-1 animate-pulse" />
                <div className="h-4 bg-white/10 rounded w-20 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Search Skeleton */}
          <SearchBarSkeleton />
          
          {/* Filter Tabs Skeleton */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-9 bg-stone-200 rounded-full animate-pulse" style={{ width: `${60 + i * 10}px` }} />
            ))}
          </div>

          {/* Exam Cards Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <ExamCardSkeleton key={i} />
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
              <ExamIcon className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold">الامتحانات</h1>
              <p className="text-white/70 text-sm">
                {search || statusFilter !== 'all' 
                  ? `${filteredExams.length} من ${exams.length} امتحان`
                  : `${exams.length} امتحان`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
            <input
              type="text"
              placeholder="ابحث عن امتحان..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-4 pr-12 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#c9a227]/20 focus:border-[#c9a227] outline-none transition-all"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { value: 'all', label: 'الكل' },
              { value: 'active', label: 'متاح الآن' },
              { value: 'completed', label: 'مكتمل' },
              { value: 'failed', label: 'راسب' },
              { value: 'upcoming', label: 'قادم' },
              { value: 'not-taken', label: 'لم يتقدم' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleStatusFilterChange(tab.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-[#1a3a2f] text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {exams.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExamIcon className="text-stone-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">لا توجد امتحانات متاحة</h3>
            <p className="text-stone-500 mb-6">سجل في دورات للوصول إلى الامتحانات</p>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a3a2f] text-white rounded-xl font-bold hover:bg-[#143026] transition"
            >
              <BookIcon size={18} />
              تصفح الدورات
            </Link>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="text-stone-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">لا توجد نتائج مطابقة</h3>
            <p className="text-stone-500 mb-6">جرب تغيير معايير البحث أو الفلتر</p>
            <button
              onClick={() => { setSearch(''); setStatusFilter('all'); setCurrentPage(1); }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a3a2f] text-white rounded-xl font-bold hover:bg-[#143026] transition"
            >
              إزالة الفلتر
            </button>
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="mb-4 text-sm text-stone-500">
              عرض {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredExams.length)} من {filteredExams.length} امتحان
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {paginatedExams.map((exam) => {
              const examStatus = getExamStatus(exam);
              const hasAttempt = exam.attempts && exam.attempts.length > 0;
              const latestAttempt = hasAttempt ? exam.attempts[0] : null;
              const score = latestAttempt?.score ?? null;
              const isRetakeAttempt = latestAttempt?.isRetake === true;
              const isFailed = examStatus.status === 'failed';
              const retakeable = canRetakeExam(exam);

              // For retake attempts, compute the effective score using exam's retake percent
              const retakeMultiplier = (exam.retakeScorePercent ?? 75) / 100;
              const effectiveScore = isRetakeAttempt && score !== null
                ? Math.round(score * retakeMultiplier * 100) / 100
                : null;

              return (
                <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold mb-1 text-stone-800">{exam.title}</h2>
                      <p className="text-stone-500">{exam.course.title}</p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg font-medium text-sm ${examStatus.color}`}>
                      {examStatus.label}
                    </span>
                  </div>

                  {exam.description && (
                    <p className="text-stone-600 mb-4">{exam.description}</p>
                  )}

                  <div className="space-y-2 mb-6 text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-stone-100">
                      <span className="text-stone-500 flex items-center gap-2">
                        <ClockIcon size={14} /> المدة
                      </span>
                      <span className="font-medium text-stone-800">{exam.durationMinutes} دقيقة</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-stone-100">
                      <span className="text-stone-500">الدرجة الكاملة</span>
                      <span className="font-medium text-stone-800">{exam.maxScore}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-stone-100">
                      <span className="text-stone-500">درجة النجاح</span>
                      <span className="font-medium text-stone-800">{exam.passingScore}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-stone-100">
                      <span className="text-stone-500">البدء</span>
                      <span className="font-medium text-stone-800" dir="ltr">
                        {formatDateTime(exam.startDate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-stone-100">
                      <span className="text-stone-500">الانتهاء</span>
                      <span className="font-medium text-stone-800" dir="ltr">
                        {formatDateTime(exam.endDate)}
                      </span>
                    </div>
                    {!hasAttempt && examStatus.status === 'not-taken' && (
                      <div className="flex justify-between items-center pt-3">
                        <span className="font-bold text-stone-800">درجتك</span>
                        <span className="text-stone-400 font-medium">لم يتقدم</span>
                      </div>
                    )}
                    {hasAttempt && score !== null && (
                      <>
                        {isRetakeAttempt && effectiveScore !== null ? (
                          <>
                            {/* Retake: effective score is your grade */}
                            <div className="flex justify-between items-center pt-3">
                              <span className="font-bold text-stone-800 flex items-center gap-1">
                                درجتك
                                <span className="relative group">
                                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-stone-200 text-stone-500 text-[10px] cursor-help">؟</span>
                                  <span className="absolute bottom-full right-0 mb-1 px-3 py-2 bg-stone-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                    محسوبة بنسبة {exam.retakeScorePercent ?? 75}% من درجة الامتحان (إعادة)
                                  </span>
                                </span>
                              </span>
                              <span className={`text-xl font-bold ${
                                effectiveScore >= exam.passingScore ? 'text-emerald-600' : 'text-red-600'
                              }`}>
                                {effectiveScore} / {exam.maxScore}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-1">
                              <span className="text-stone-400 text-xs">درجة الامتحان</span>
                              <span className="text-stone-400 text-xs">
                                {score} / {exam.maxScore}
                              </span>
                            </div>
                          </>
                        ) : (
                          /* Normal attempt: show raw score */
                          <div className="flex justify-between items-center pt-3">
                            <span className="font-bold text-stone-800">درجتك</span>
                            <span className={`text-xl font-bold ${
                              score >= exam.passingScore ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {score} / {exam.maxScore}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {examStatus.status === 'active' && !hasAttempt && (
                    <Link
                      href={`/dashboard/exams/${exam.id}/take`}
                      className="block w-full py-3 bg-[#1a3a2f] text-white rounded-lg font-bold text-center hover:bg-[#143026] transition"
                    >
                      بدء الامتحان
                    </Link>
                  )}

                  {/* Failed exam: show retake button if eligible */}
                  {isFailed && (
                    <>
                      <div className="py-3 bg-red-50 text-red-700 rounded-lg text-center font-medium flex items-center justify-center gap-2">
                        راسب
                      </div>
                      {retakeable && (
                        <>
                          <Link
                            href={`/dashboard/exams/${exam.id}/take`}
                            className="block w-full mt-2 py-3 bg-orange-500 text-white rounded-lg font-bold text-center hover:bg-orange-600 transition"
                          >
                            إعادة الاختبار
                          </Link>
                          <p className="text-xs text-stone-500 text-center mt-2">
                            العلامة القصوى في الإعادة: {Math.round(exam.maxScore * ((exam.retakeScorePercent ?? 75) / 100))}
                          </p>
                        </>
                      )}
                    </>
                  )}

                  {/* Passed / completed exam */}
                  {hasAttempt && !isFailed && (
                    <>
                      <div className="py-3 bg-emerald-50 text-emerald-700 rounded-lg text-center font-medium flex items-center justify-center gap-2">
                        <CheckCircleIcon size={18} /> تم إكمال الامتحان
                      </div>
                      
                      {/* Review button - ONLY for passed students */}
                      {score !== null && (() => {
                        // For retake attempts, check effective score for pass
                        const passScore = isRetakeAttempt && effectiveScore !== null ? effectiveScore : score;
                        if (passScore < exam.passingScore) return null;

                        const isAfterEndDate = new Date() > new Date(exam.endDate);
                        const endDateFormatted = formatDate(exam.endDate);
                        const endTimeFormatted = formatTime(exam.endDate);

                        if (isAfterEndDate) {
                          // ENABLED - can review now
                          return (
                            <Link
                              href={`/dashboard/exams/${exam.id}/review`}
                              className="block w-full mt-2 py-3 bg-sky-50 text-sky-700 rounded-lg font-medium text-center hover:bg-sky-100 transition"
                            >
                              مراجعة الإجابات
                            </Link>
                          );
                        } else {
                          // DISABLED - show tooltip with available date
                          return (
                            <div className="relative group mt-2">
                              <button
                                disabled
                                className="w-full py-3 bg-stone-100 text-stone-400 rounded-lg font-medium cursor-not-allowed"
                              >
                                مراجعة الإجابات
                              </button>
                              {/* Tooltip on hover */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-stone-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                ستتوفر الإجابات بعد {endDateFormatted} {endTimeFormatted}
                              </div>
                            </div>
                          );
                        }
                      })()}
                    </>
                  )}

                  {examStatus.status === 'upcoming' && (
                    <div className="py-3 bg-sky-50 text-sky-700 rounded-lg text-center font-medium">
                      سيتم فتح الامتحان قريباً
                    </div>
                  )}

                  {examStatus.status === 'not-taken' && !hasAttempt && (
                    <div className="py-3 bg-stone-100 text-stone-500 rounded-lg text-center font-medium">
                      لم يتم تقديم الامتحان
                    </div>
                  )}
                </div>
              );
            })}
          </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  aria-label="الصفحة السابقة"
                >
                  <ChevronRightIcon size={20} />
                </button>
                
                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .map((page, index, arr) => {
                      const prevPage = arr[index - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;
                      
                      return (
                        <span key={page} className="flex items-center">
                          {showEllipsis && (
                            <span className="px-2 text-stone-400">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`min-w-[40px] h-10 rounded-lg font-medium transition ${
                              currentPage === page
                                ? 'bg-[#1a3a2f] text-white'
                                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            {page}
                          </button>
                        </span>
                      );
                    })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  aria-label="الصفحة التالية"
                >
                  <ChevronLeftIcon size={20} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

