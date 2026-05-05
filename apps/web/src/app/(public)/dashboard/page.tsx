'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import api from '@/lib/api';
import { BookIcon, ExamIcon, HomeworkIcon, StarIcon, PlayIcon, AwardIcon, CheckCircleIcon, ChevronDownIcon, SparkleIcon } from '@/components/Icons';
import { 
  DashboardCourseCardSkeleton, 
  NavCardSkeleton, 
  ContinueLearningCardSkeleton,
  DeadlineItemSkeleton 
} from '@/components/Skeleton';
import { LiveRegion } from '@/components/Accessibility';
import { CourseCoverImage } from '@/components/OptimizedImage';
import Tooltip from '@/components/Tooltip';
import { shouldShowSkeleton } from '@/lib/swr-config';
import { isEnrollmentCompleted } from '@/lib/enrollment';
import { formatDate } from '@/lib/utils';
import HomePromotionsSection from '@/components/HomePromotionsSection';

// SWR fetcher
const fetcher = async (url: string) => {
  const response = await api.get(url);
  return response.data;
};

interface LessonProgress {
  id: string;
  completedAt: string;
}

interface Lesson {
  id: string;
  title: string;
  order: number;
  progress: LessonProgress[];
}

interface Module {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface Enrollment {
  id: string;
  finalScore: number | null;
  overrideScore: number | null;
  finalizedAt: string | null;
  course: {
    id: string;
    title: string;
    coverImage?: string;
    lifecycle?: string;
    modules: Module[];
  };
}

interface Deadline {
  id: string;
  title: string;
  type: 'exam' | 'homework';
  dueDate: string;
  courseTitle: string;
  courseId: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeExamsCount, setActiveExamsCount] = useState(0);
  const [pendingHomeworkCount, setPendingHomeworkCount] = useState(0);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Deadline[]>([]);
  const [examsLoaded, setExamsLoaded] = useState(false);
  const [inProgressOpen, setInProgressOpen] = useState(true);
  const [completedOpen, setCompletedOpen] = useState(false);

  // Use SWR for user data (cached) - keepPreviousData prevents flash on navigation
  const { data: user, isLoading: userLoading, error: userError } = useSWR(
    '/auth/me',
    fetcher,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      errorRetryCount: 0,
      onError: () => router.push('/login'),
    }
  );

  // Use SWR for enrollments (cached) - keepPreviousData prevents flash
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useSWR<Enrollment[]>(
    user ? '/enrollments/my-enrollments' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      dedupingInterval: 10000,
    }
  );

  // Extract courses from enrollments
  const courses = useMemo(() => {
    return enrollments.map((e: any) => e.course).filter((c: any) => c);
  }, [enrollments]);


  // Split enrollments into in-progress and completed
  const { inProgressEnrollments, completedEnrollments } = useMemo(() => {
    const inProgress: Enrollment[] = [];
    const completed: Enrollment[] = [];
    enrollments.forEach((enrollment) => {
      if (isEnrollmentCompleted(enrollment)) {
        completed.push(enrollment);
      } else {
        inProgress.push(enrollment);
      }
    });
    return { inProgressEnrollments: inProgress, completedEnrollments: completed };
  }, [enrollments]);

  // Load exams and homework IN PARALLEL when courses are available
  useEffect(() => {
    if (!courses.length || examsLoaded) return;

    const loadExamsAndHomework = async () => {
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      let activeExams = 0;
      let pendingHw = 0;
      const deadlines: Deadline[] = [];

      // Load ALL exams and homework in PARALLEL
      const examPromises = courses.map((course: any) =>
        api.get(`/exams/course/${course.id}`)
          .then(res => ({ courseId: course.id, courseTitle: course.title, data: res.data || [] }))
          .catch(() => ({ courseId: course.id, courseTitle: course.title, data: [] }))
      );
      
      const homeworkPromises = courses.map((course: any) =>
        api.get(`/homework/course/${course.id}`)
          .then(res => ({ courseId: course.id, courseTitle: course.title, data: res.data || [] }))
          .catch(() => ({ courseId: course.id, courseTitle: course.title, data: [] }))
      );

      const [examResults, homeworkResults] = await Promise.all([
        Promise.all(examPromises),
        Promise.all(homeworkPromises),
      ]);

      // Process exam results
      for (const result of examResults) {
        for (const exam of result.data) {
          const start = new Date(exam.startDate);
          const end = new Date(exam.endDate);
          const hasAttempt = exam.attempts && exam.attempts.length > 0;
          
          if (!hasAttempt && now >= start && now <= end) {
            activeExams++;
          }
          
          if (!hasAttempt && end > now && end <= sevenDaysLater) {
            deadlines.push({
              id: exam.id,
              title: exam.title,
              type: 'exam',
              dueDate: exam.endDate,
              courseTitle: result.courseTitle,
              courseId: result.courseId,
            });
          }
        }
      }

      // Process homework results
      for (const result of homeworkResults) {
        for (const hw of result.data) {
          const due = new Date(hw.dueDate);
          const hasSubmission = hw.submissions && hw.submissions.length > 0;
          
          if (!hasSubmission && now <= due) {
            pendingHw++;
          }
          
          if (!hasSubmission && due > now && due <= sevenDaysLater) {
            deadlines.push({
              id: hw.id,
              title: hw.title,
              type: 'homework',
              dueDate: hw.dueDate,
              courseTitle: result.courseTitle,
              courseId: result.courseId,
            });
          }
        }
      }

      setActiveExamsCount(activeExams);
      setPendingHomeworkCount(pendingHw);
      // Sort by due date
      deadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      setUpcomingDeadlines(deadlines.slice(0, 5)); // Show max 5
      setExamsLoaded(true);
    };

    loadExamsAndHomework();
  }, [courses, examsLoaded]);

  // Only show skeleton on truly fresh loads, not navigation between cached pages
  // This prevents the "flash" effect when navigating
  const showSkeleton = shouldShowSkeleton(userLoading, user) || shouldShowSkeleton(enrollmentsLoading, enrollments.length > 0 ? enrollments : undefined);

  // Find next lesson to continue
  const getNextLesson = () => {
    for (const enrollment of enrollments) {
      const sortedModules = [...enrollment.course.modules].sort((a, b) => a.order - b.order);
      for (const mod of sortedModules) {
        const sortedLessons = [...mod.lessons].sort((a, b) => a.order - b.order);
        for (const lesson of sortedLessons) {
          if (!lesson.progress || lesson.progress.length === 0) {
            return {
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              courseId: enrollment.course.id,
              courseTitle: enrollment.course.title,
              moduleTitle: mod.title,
            };
          }
        }
      }
    }
    return null;
  };

  if (showSkeleton) {
    return (
      <div className="min-h-screen bg-stone-50">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="h-8 bg-white/20 rounded w-48 mb-2 animate-pulse" />
                <div className="h-5 bg-white/10 rounded w-64 animate-pulse" />
              </div>
              <div className="h-12 bg-white/20 rounded-xl w-36 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quick Stats Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <NavCardSkeleton key={i} />
            ))}
          </div>

          {/* Continue Learning Skeleton */}
          <div className="mb-8">
            <div className="h-6 bg-stone-200 rounded w-32 mb-4 animate-pulse" />
            <ContinueLearningCardSkeleton />
          </div>

          {/* My Courses Skeleton */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 bg-stone-200 rounded w-24 animate-pulse" />
              <div className="h-4 bg-stone-200 rounded w-20 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <DashboardCourseCardSkeleton key={i} />
              ))}
            </div>
          </div>

          {/* Upcoming Deadlines Skeleton */}
          <div>
            <div className="h-6 bg-stone-200 rounded w-36 mb-4 animate-pulse" />
            <div className="bg-white rounded-xl shadow-sm border border-stone-100">
              {[...Array(3)].map((_, i) => (
                <DeadlineItemSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Screen reader announcement */}
      <LiveRegion>تم تحميل لوحة التحكم</LiveRegion>
      
      {/* Welcome Header */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">مرحباً، {user?.name}</h1>
              <p className="text-white/70">تابع رحلتك في طلب العلم الشرعي</p>
            </div>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#c9a227] text-white rounded-xl font-bold hover:bg-[#b08f20] transition-all shadow-lg"
            >
              <BookIcon size={20} />
              تصفح الدورات
            </Link>
          </div>
        </div>
      </div>

      <HomePromotionsSection variant="dashboard" userGender={user?.gender} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-stone-100 rounded-lg flex items-center justify-center">
                <BookIcon className="text-stone-600" size={20} />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-stone-800">{enrollments.length}</p>
                <p className="text-xs md:text-sm text-stone-500">دوراتي</p>
              </div>
            </div>
          </div>
          <Link href="/dashboard/exams" className="group bg-white rounded-xl p-4 md:p-6 shadow-sm border border-stone-100 hover:border-[#c9a227]/30 transition-all relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-stone-100 rounded-lg flex items-center justify-center group-hover:bg-stone-200 transition-colors relative">
                <ExamIcon className="text-stone-600" size={20} />
                {activeExamsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {activeExamsCount}
                  </span>
                )}
              </div>
              <div>
                <p className="text-lg font-bold text-stone-800">الامتحانات</p>
                <p className="text-xs md:text-sm text-stone-500">
                  {activeExamsCount > 0 ? `${activeExamsCount} متاح الآن` : 'عرض الكل'}
                </p>
              </div>
            </div>
          </Link>
          <Link href="/dashboard/homework" className="group bg-white rounded-xl p-4 md:p-6 shadow-sm border border-stone-100 hover:border-[#c9a227]/30 transition-all relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-stone-100 rounded-lg flex items-center justify-center group-hover:bg-stone-200 transition-colors relative">
                <HomeworkIcon className="text-stone-600" size={20} />
                {pendingHomeworkCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {pendingHomeworkCount}
                  </span>
                )}
              </div>
              <div>
                <p className="text-lg font-bold text-stone-800">الواجبات</p>
                <p className="text-xs md:text-sm text-stone-500">
                  {pendingHomeworkCount > 0 ? `${pendingHomeworkCount} في الانتظار` : 'عرض الكل'}
                </p>
              </div>
            </div>
          </Link>
          <Link href="/dashboard/grades" className="group bg-white rounded-xl p-4 md:p-6 shadow-sm border border-stone-100 hover:border-[#c9a227]/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-stone-100 rounded-lg flex items-center justify-center group-hover:bg-stone-200 transition-colors">
                <StarIcon className="text-stone-600" size={20} />
              </div>
              <div>
                <p className="text-lg font-bold text-stone-800">الدرجات</p>
                <p className="text-xs md:text-sm text-stone-500">عرض الكل</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Continue Learning Section */}
        {(() => {
          const nextLesson = getNextLesson();
          if (nextLesson) {
            return (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-stone-800 mb-4">متابعة التعلم</h2>
                <Link
                  href={`/courses/${nextLesson.courseId}/lessons/${nextLesson.lessonId}`}
                  className="group block bg-gradient-to-l from-[#1a3a2f] to-[#2d5a4a] rounded-xl p-5 text-white hover:shadow-lg transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20 transition-colors">
                        <PlayIcon className="text-white" size={24} />
                      </div>
                      <div>
                        <p className="text-white/70 text-sm mb-1">{nextLesson.courseTitle} • {nextLesson.moduleTitle}</p>
                        <p className="font-bold text-lg">{nextLesson.lessonTitle}</p>
                      </div>
                    </div>
                    <div className="bg-[#c9a227] px-4 py-2 rounded-lg font-bold group-hover:bg-[#b08f20] transition-colors">
                      متابعة
                    </div>
                  </div>
                </Link>
              </div>
            );
          }
          return null;
        })()}

        {/* Upcoming Deadlines Section */}
        {upcomingDeadlines.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-stone-800 mb-4">المواعيد القادمة</h2>
            <div className="bg-white rounded-xl shadow-sm border border-stone-100 divide-y divide-stone-100">
              {upcomingDeadlines.map((deadline) => {
                const dueDate = new Date(deadline.dueDate);
                const now = new Date();
                const diffMs = dueDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                const isUrgent = diffDays <= 2;
                
                return (
                  <Link
                    key={`${deadline.type}-${deadline.id}`}
                    href={deadline.type === 'exam' ? `/dashboard/exams` : `/dashboard/homework`}
                    className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        deadline.type === 'exam' ? 'bg-sky-50' : 'bg-amber-50'
                      }`}>
                        {deadline.type === 'exam' ? (
                          <ExamIcon className="text-sky-600" size={18} />
                        ) : (
                          <HomeworkIcon className="text-amber-600" size={18} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-stone-800">{deadline.title}</p>
                        <p className="text-sm text-stone-500">{deadline.courseTitle}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-medium ${isUrgent ? 'text-red-600' : 'text-stone-600'}`}>
                        {diffDays === 0 
                          ? 'اليوم' 
                          : diffDays === 1 
                            ? 'غداً' 
                            : diffDays === 2 
                              ? 'باقي يومان'
                              : `باقي ${diffDays} أيام`}
                      </p>
                      <p className="text-xs text-stone-400">
                        {formatDate(dueDate)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {enrollments.length === 0 ? (
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-12 text-center">
              <div className="w-16 h-16 bg-[#1a3a2f]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookIcon className="text-[#1a3a2f]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-stone-800 mb-2">لم تسجل في أي دورة بعد</h3>
              <p className="text-stone-500 mb-6">ابدأ رحلتك في طلب العلم الشرعي الآن</p>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a3a2f] text-white rounded-xl font-bold hover:bg-[#143026] transition"
              >
                <BookIcon size={18} />
                تصفح الدورات المتاحة
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* In Progress Courses */}
            {inProgressEnrollments.length > 0 && (
              <div className="mb-8">
                <button
                  onClick={() => setInProgressOpen(!inProgressOpen)}
                  className="flex items-center gap-2 mb-4 group"
                >
                  <ChevronDownIcon
                    className={`text-stone-400 transition-transform duration-300 ${inProgressOpen ? '' : 'rotate-90'}`}
                    size={20}
                  />
                  <PlayIcon className="text-[#1a3a2f]" size={20} />
                  <h2 className="text-xl font-bold text-stone-800">الدورات الحالية</h2>
                  <span className="text-sm text-stone-600 bg-stone-200 px-2 py-0.5 rounded-full">{inProgressEnrollments.length}</span>
                </button>
                {inProgressOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {inProgressEnrollments.map((enrollment) => {
                    const totalLessons = enrollment.course.modules.reduce(
                      (sum, module) => sum + module.lessons.length, 0
                    );
                    const completedLessons = enrollment.course.modules.reduce(
                      (sum, module) => sum + module.lessons.filter(
                        (lesson) => lesson.progress && lesson.progress.length > 0
                      ).length, 0
                    );
                    const progressPercent = totalLessons > 0
                      ? Math.round((completedLessons / totalLessons) * 100)
                      : 0;

                    return (
                      <Link
                        key={enrollment.id}
                        href={`/courses/${enrollment.course.id}`}
                        className="group bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 border border-stone-100"
                      >
                        <div className="h-40 md:h-44 bg-gradient-to-br from-[#1a3a2f] to-[#2d5a4a] relative">
                          <CourseCoverImage
                            src={enrollment.course.coverImage}
                            alt={enrollment.course.title}
                          />
                          {enrollment.course.lifecycle === 'ONGOING' && (
                            <div className="absolute top-3 left-3 z-[1]">
                              <Tooltip text="هذه الدورة تقام وجاهيّاً ويتم إضافة الدروس والمواد فور تسجيلها">
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-500 text-white shadow-sm">
                                  <SparkleIcon size={12} />
                                  وجاهي
                                </span>
                              </Tooltip>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                              <PlayIcon className="text-white" size={28} />
                            </div>
                          </div>
                        </div>
                        <div className="p-5">
                          <h3 className="text-lg font-bold text-stone-800 mb-3 group-hover:text-[#1a3a2f] transition-colors line-clamp-1">
                            {enrollment.course.title}
                          </h3>
                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-stone-500">التقدم</span>
                              <span className="text-stone-600 font-medium">
                                {completedLessons} / {totalLessons} درس
                              </span>
                            </div>
                            <div className="w-full bg-stone-100 rounded-full h-2">
                              <div
                                className="bg-[#c9a227] h-2 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-2 py-2.5 bg-[#1a3a2f] text-white rounded-lg font-medium group-hover:bg-[#143026] transition-colors">
                            <PlayIcon size={16} />
                            {progressPercent > 0 ? 'متابعة التعلم' : 'ابدأ التعلم'}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                )}
              </div>
            )}

            {/* Completed Courses */}
            {completedEnrollments.length > 0 && (
              <div className="mb-8">
                <button
                  onClick={() => setCompletedOpen(!completedOpen)}
                  className="flex items-center gap-2 mb-4 group"
                >
                  <ChevronDownIcon
                    className={`text-stone-400 transition-transform duration-300 ${completedOpen ? '' : 'rotate-90'}`}
                    size={20}
                  />
                  <AwardIcon className="text-[#c9a227]" size={20} />
                  <h2 className="text-xl font-bold text-stone-800">الدورات المكتملة</h2>
                  <span className="text-sm text-stone-600 bg-stone-200 px-2 py-0.5 rounded-full">{completedEnrollments.length}</span>
                </button>
                {completedOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {completedEnrollments.map((enrollment) => {
                    const totalLessons = enrollment.course.modules.reduce(
                      (sum, module) => sum + module.lessons.length, 0
                    );

                    return (
                      <Link
                        key={enrollment.id}
                        href={`/courses/${enrollment.course.id}`}
                        className="group bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 border border-stone-100"
                      >
                        <div className="h-40 md:h-44 bg-gradient-to-br from-[#1a3a2f] to-[#2d5a4a] relative">
                          <CourseCoverImage
                            src={enrollment.course.coverImage}
                            alt={enrollment.course.title}
                          />
                          {enrollment.course.lifecycle === 'ONGOING' && (
                            <div className="absolute top-3 left-3 z-[1]">
                              <Tooltip text="هذه الدورة تقام وجاهيّاً ويتم إضافة الدروس والمواد فور تسجيلها">
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-500 text-white shadow-sm">
                                  <SparkleIcon size={12} />
                                  وجاهي
                                </span>
                              </Tooltip>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                              <PlayIcon className="text-white" size={28} />
                            </div>
                          </div>
                        </div>
                        <div className="p-5">
                          <h3 className="text-lg font-bold text-stone-800 mb-3 group-hover:text-[#1a3a2f] transition-colors line-clamp-1">
                            {enrollment.course.title}
                          </h3>
                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-stone-500">الدروس</span>
                              <span className="text-stone-600 font-medium">
                                {totalLessons} درس
                              </span>
                            </div>
                            <div className="w-full bg-stone-100 rounded-full h-2">
                              <div
                                className="bg-[#c9a227] h-2 rounded-full"
                                style={{ width: '100%' }}
                              ></div>
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-2 py-2.5 bg-stone-100 text-stone-700 rounded-lg font-medium group-hover:bg-stone-200 transition-colors">
                            <BookIcon size={16} />
                            مراجعة الدورة
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

