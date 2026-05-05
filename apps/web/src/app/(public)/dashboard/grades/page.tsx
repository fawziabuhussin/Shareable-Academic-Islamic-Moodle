'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import api from '@/lib/api';
import { StarIcon, ChartIcon } from '@/components/Icons';
import { navigateTo } from '@/lib/navigation';
import { FileText, ClipboardList, HelpCircle, BookOpen, Award, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { getLetterGradeColor, getGradeCellBg, FAILING_GRADE } from '@/lib/grades';

// Types
interface AssessmentScore {
  id: string;
  type: 'EXAM' | 'HOMEWORK' | 'QUIZ';
  title: string;
  score: number | null;
  effectiveScore?: number | null;
  maxScore: number;
  weightPercent: number;
  isRetake?: boolean;
}

interface CourseGrade {
  courseId: string;
  courseTitle: string;
  coverImage: string | null;
  finalScore: number | null;
  effectiveScore: number | null;
  letterGrade: string | null;
  isFinalized: boolean;
  assessments: AssessmentScore[];
  readingWeight: number;
  lessonCompletionPercent: number;
}

interface StudentGradesSummary {
  courses: CourseGrade[];
  average: number;
  averageFormatted: string;
  finalizedCourseCount: number;
}

// Helper functions
const getTypeLabel = (type: string) => {
  switch (type) {
    case 'EXAM': return 'امتحان';
    case 'HOMEWORK': return 'واجب';
    case 'QUIZ': return 'اختبار قصير';
    default: return type;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'EXAM': return <FileText size={14} className="text-purple-500" />;
    case 'HOMEWORK': return <ClipboardList size={14} className="text-orange-500" />;
    case 'QUIZ': return <HelpCircle size={14} className="text-sky-500" />;
    default: return null;
  }
};

const fetcher = (url: string) => api.get(url).then(r => r.data);

type SortField = 'default' | 'name' | 'status' | 'score';
type SortDir = 'asc' | 'desc';

function sortCourses(courses: CourseGrade[], sortBy: SortField, sortDir: SortDir): CourseGrade[] {
  return [...courses].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;

    if (sortBy === 'name') {
      return a.courseTitle.localeCompare(b.courseTitle, 'ar') * dir;
    }

    if (sortBy === 'status') {
      if (a.isFinalized !== b.isFinalized) return a.isFinalized ? -dir : dir;
      return a.courseTitle.localeCompare(b.courseTitle, 'ar');
    }

    if (sortBy === 'score') {
      const sa = a.effectiveScore ?? -1;
      const sb = b.effectiveScore ?? -1;
      if (sa !== sb) return (sa - sb) * dir;
      return a.courseTitle.localeCompare(b.courseTitle, 'ar');
    }

    // default: finalized first, then alphabetically
    if (a.isFinalized && !b.isFinalized) return -1;
    if (!a.isFinalized && b.isFinalized) return 1;
    return a.courseTitle.localeCompare(b.courseTitle, 'ar');
  });
}

export default function StudentGradesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortField>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const toggleCourse = (courseId: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user) {
      navigateTo('/login', router);
      return;
    }
    setUserId(user.id);
  }, [router]);

  const { data, isLoading } = useSWR<StudentGradesSummary>(
    userId ? `/grades/student/${userId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  if (isLoading || !userId) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-white/10 rounded-lg animate-pulse" />
              <div>
                <div className="h-6 bg-white/20 rounded w-28 mb-1 animate-pulse" />
                <div className="h-4 bg-white/10 rounded w-16 animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white/10 rounded-xl px-4 py-3 animate-pulse">
                  <div className="h-3 bg-white/10 rounded w-16 mx-auto mb-2" />
                  <div className="h-7 bg-white/15 rounded w-12 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-3">
            <div className="h-14 bg-stone-200 rounded-xl" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-stone-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const courses = sortCourses(data?.courses || [], sortBy, sortDir);
  const averageFormatted = data?.averageFormatted || '0.00%';
  const finalizedCourseCount = data?.finalizedCourseCount || 0;
  const passedCount = (data?.courses || []).filter(c => c.isFinalized && c.letterGrade && c.letterGrade !== FAILING_GRADE).length;
  const failedCount = (data?.courses || []).filter(c => c.isFinalized && c.letterGrade === FAILING_GRADE).length;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <StarIcon className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold">التقييمات والدرجات</h1>
            </div>
          </div>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
              <p className="text-white/60 text-xs mb-1">المعدل العام</p>
              <p className="text-2xl font-bold">{finalizedCourseCount > 0 ? averageFormatted : '—'}</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
              <p className="text-white/60 text-xs mb-1">دورات مكتملة</p>
              <p className="text-2xl font-bold">{finalizedCourseCount}</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
              <p className="text-white/60 text-xs mb-1">ناجح</p>
              <p className="text-2xl font-bold text-emerald-300">{passedCount}</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
              <p className="text-white/60 text-xs mb-1">راسب</p>
              <p className="text-2xl font-bold text-red-300">{failedCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Empty State */}
        {courses.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <StarIcon className="text-stone-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">لم يتم التسجيل في أي دورة بعد</h3>
            <p className="text-stone-500">سجل في الدورات المتاحة لبدء رحلتك التعليمية</p>
          </div>
        )}

        {/* Courses Table */}
        {courses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 px-4 py-3 bg-stone-50/80 border-b border-stone-200 text-xs font-semibold text-stone-400 uppercase tracking-wide">
              <div className="col-span-1" />
              <button
                onClick={() => toggleSort('name')}
                className="col-span-5 sm:col-span-4 flex items-center gap-1 hover:text-stone-700 transition-colors cursor-pointer"
              >
                الدورة
                {sortBy === 'name' ? (
                  sortDir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />
                ) : (
                  <ArrowUpDown size={12} className="text-stone-300" />
                )}
              </button>
              <button
                onClick={() => toggleSort('status')}
                className="col-span-2 sm:col-span-3 flex items-center justify-center gap-1 hover:text-stone-700 transition-colors cursor-pointer"
              >
                الحالة
                {sortBy === 'status' ? (
                  sortDir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />
                ) : (
                  <ArrowUpDown size={12} className="text-stone-300" />
                )}
              </button>
              <button
                onClick={() => toggleSort('score')}
                className="col-span-4 flex items-center justify-center gap-1 hover:text-stone-700 transition-colors cursor-pointer"
              >
                <span className="hidden sm:inline">الدرجة النهائية</span>
                <span className="sm:hidden">الدرجة</span>
                {sortBy === 'score' ? (
                  sortDir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />
                ) : (
                  <ArrowUpDown size={12} className="text-stone-300" />
                )}
              </button>
            </div>

            {courses.map((course, idx) => {
              const isExpanded = expandedCourses.has(course.courseId);
              const isLast = idx === courses.length - 1;

              return (
                <div key={course.courseId}>
                  {/* Course Row */}
                  <button
                    onClick={() => toggleCourse(course.courseId)}
                    className={`w-full grid grid-cols-12 items-center text-right hover:bg-stone-50/80 transition-all duration-150 cursor-pointer group ${
                      !isLast && !isExpanded ? 'border-b border-stone-100' : ''
                    }`}
                  >
                    {/* Expand Arrow */}
                    <div className="col-span-1 flex items-center justify-center py-4 px-2">
                      <ChevronDown
                        size={16}
                        className={`text-stone-300 group-hover:text-stone-500 transition-all duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>

                    {/* Course Name */}
                    <div className="col-span-5 sm:col-span-4 flex items-center gap-2 sm:gap-3 py-4">
                      <span className="text-[10px] text-stone-400 font-medium w-4 text-center shrink-0">{idx + 1}</span>
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-[#1a3a2f] to-[#2d5a4a] flex items-center justify-center text-white font-bold text-xs sm:text-sm shrink-0 shadow-sm">
                        {course.courseTitle.charAt(0)}
                      </div>
                      <span className="font-semibold text-stone-800 text-xs sm:text-sm truncate group-hover:text-[#1a3a2f] transition-colors">
                        {course.courseTitle}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="col-span-2 sm:col-span-3 flex justify-center py-4">
                      <span className={`px-1.5 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold ${
                        course.isFinalized
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                          : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                      }`}>
                        {course.isFinalized ? 'مكتملة' : 'جارية'}
                      </span>
                    </div>

                    {/* Grade Cell */}
                    <div className={`col-span-4 flex items-center justify-center gap-1 sm:gap-2 py-4 self-stretch ${getGradeCellBg(course.letterGrade)}`}>
                      {course.letterGrade ? (
                        <>
                          <span className="text-sm font-bold text-stone-700">
                            {course.effectiveScore != null ? `${course.effectiveScore.toFixed(1)}%` : ''}
                          </span>
                          <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-black ${getLetterGradeColor(course.letterGrade)}`}>
                            {course.letterGrade}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-bold text-stone-400">
                          {course.effectiveScore != null
                            ? `${course.effectiveScore.toFixed(1)}%`
                            : '—'}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Expanded Assessment Details */}
                  {isExpanded && (
                    <div className={`bg-gradient-to-b from-stone-50/80 to-stone-50/40 ${!isLast ? 'border-b border-stone-200' : ''}`}>
                      <div className="px-4 sm:px-6 py-3 space-y-1.5">
                        {course.assessments.map((assessment) => {
                          const scorePercent = assessment.score !== null ? (assessment.score / assessment.maxScore) * 100 : null;
                          return (
                            <div
                              key={assessment.id}
                              className="bg-white rounded-lg border border-stone-100 px-4 py-3 hover:border-stone-200 transition-colors"
                            >
                              <div className="grid grid-cols-12 gap-2 items-center">
                                {/* Assessment name */}
                                <div className="col-span-12 sm:col-span-5 flex items-center gap-2.5">
                                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                                    assessment.type === 'EXAM' ? 'bg-purple-50' :
                                    assessment.type === 'HOMEWORK' ? 'bg-orange-50' : 'bg-sky-50'
                                  }`}>
                                    {getTypeIcon(assessment.type)}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-sm font-medium text-stone-700 block truncate">{assessment.title}</span>
                                    <span className="text-[11px] text-stone-400">
                                      {getTypeLabel(assessment.type)}
                                    </span>
                                  </div>
                                </div>

                                {/* Weight */}
                                <div className="col-span-4 sm:col-span-2 text-center">
                                  <span className="text-[11px] text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full">وزن {assessment.weightPercent}%</span>
                                </div>

                                {/* Score */}
                                <div className="col-span-4 sm:col-span-3 flex flex-col items-center gap-1">
                                  {assessment.score !== null ? (
                                    <>
                                      <span className="text-sm font-semibold text-stone-700">
                                        {assessment.score}/{assessment.maxScore}
                                      </span>
                                      <div className="w-full max-w-[60px] bg-stone-100 rounded-full h-1 hidden sm:block">
                                        <div
                                          className={`h-1 rounded-full transition-all ${
                                            (scorePercent ?? 0) >= 70 ? 'bg-emerald-400' :
                                            (scorePercent ?? 0) >= 50 ? 'bg-amber-400' : 'bg-red-400'
                                          }`}
                                          style={{ width: `${scorePercent}%` }}
                                        />
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-[11px] text-stone-300 italic">لم يُقدَّم</span>
                                  )}
                                </div>

                                {/* Retake info */}
                                <div className="col-span-4 sm:col-span-2 text-center">
                                  {assessment.isRetake && assessment.effectiveScore != null && (
                                    <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                      الفعلية: {assessment.effectiveScore} (إعادة)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Reading progress row */}
                        {course.readingWeight > 0 && (
                          <div className="bg-white rounded-lg border border-stone-100 px-4 py-3">
                            <div className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-12 sm:col-span-5 flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center shrink-0">
                                  <BookOpen size={14} className="text-[#1a3a2f]" />
                                </div>
                                <span className="text-sm font-medium text-stone-700">القراءة والمتابعة</span>
                              </div>
                              <div className="col-span-4 sm:col-span-2 text-center">
                                <span className="text-[11px] text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full">وزن {course.readingWeight}%</span>
                              </div>
                              <div className="col-span-8 sm:col-span-5 flex items-center gap-2 justify-center sm:justify-start">
                                <div className="w-24 bg-stone-100 rounded-full h-1.5">
                                  <div
                                    className="bg-gradient-to-l from-[#1a3a2f] to-[#2d5a4a] h-1.5 rounded-full transition-all"
                                    style={{ width: `${course.lessonCompletionPercent}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-stone-600">
                                  {course.lessonCompletionPercent}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
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
