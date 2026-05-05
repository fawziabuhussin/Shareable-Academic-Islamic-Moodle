'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import api from '@/lib/api';
import { BookIcon, UserIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, AwardIcon, SparkleIcon } from '@/components/Icons';
import { CourseCardSkeleton, SearchBarSkeleton, CategoryFilterSkeleton } from '@/components/Skeleton';
import { CourseCoverImage } from '@/components/OptimizedImage';
import Tooltip from '@/components/Tooltip';
import { shouldShowSkeleton } from '@/lib/swr-config';
import { getEnrollmentStatus, EnrollmentStatus } from '@/lib/enrollment';

interface Category {
  id: string;
  title: string;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  coverImage?: string;
  price?: number;
  lifecycle?: string;
  category: { id: string; title: string };
  teacher: { name: string };
  _count: { enrollments: number };
}

interface EnrollmentLesson {
  id: string;
  progress: { id: string; completedAt: string }[];
}

interface EnrollmentModule {
  id: string;
  lessons: EnrollmentLesson[];
}

interface MyEnrollment {
  id: string;
  status: string;
  finalScore: number | null;
  overrideScore: number | null;
  finalizedAt: string | null;
  course: {
    id: string;
    modules: EnrollmentModule[];
  };
}


// Paginated API response type
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// SWR fetcher that extracts data from paginated response
const fetcher = async (url: string) => {
  const response = await api.get(url);
  // Handle both paginated and non-paginated responses
  return response.data?.data ?? response.data;
};

// Fetcher for paginated response with metadata
const paginatedFetcher = async (url: string): Promise<PaginatedResponse<Course>> => {
  const response = await api.get(url);
  return response.data;
};

// Items per page for pagination
const ITEMS_PER_PAGE = 9;

export default function CoursesPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user is logged in (client-side only)
  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('accessToken'));
  }, []);

  // Fetch user's enrollments if logged in
  const { data: myEnrollments = [] } = useSWR<MyEnrollment[]>(
    isLoggedIn ? '/enrollments/my-enrollments' : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      dedupingInterval: 30000,
    }
  );

  // Build a map of courseId -> enrollment status
  const enrollmentMap = useMemo(() => {
    const map = new Map<string, EnrollmentStatus>();
    myEnrollments.forEach((enrollment) => {
      if (enrollment.course?.id) {
        map.set(enrollment.course.id, getEnrollmentStatus(enrollment));
      }
    });
    return map;
  }, [myEnrollments]);

  // Build URL with filters — fetch ALL courses for client-side sorting & pagination
  const coursesUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (selectedCategory) params.append('categoryId', selectedCategory);
    params.append('page', '1');
    params.append('limit', '1000');
    return `/courses/public?${params.toString()}`;
  }, [search, selectedCategory]);

  // Fetch all courses with SWR (cached)
  const { data: coursesResponse, isLoading: coursesLoading, isValidating } = useSWR<PaginatedResponse<Course>>(
    coursesUrl,
    paginatedFetcher,
    { 
      revalidateOnFocus: false,
      keepPreviousData: true,
      dedupingInterval: 5000,
    }
  );

  // Sort courses globally: not-enrolled first, then enrolled, then completed
  const allSortedCourses = useMemo(() => {
    const raw = coursesResponse?.data ?? [];
    if (!isLoggedIn || myEnrollments.length === 0) return raw;
    const statusOrder: Record<string, number> = { none: 0, enrolled: 1, completed: 2 };
    return [...raw].sort((a, b) => {
      const aStatus = enrollmentMap.get(a.id) ?? 'none';
      const bStatus = enrollmentMap.get(b.id) ?? 'none';
      return (statusOrder[aStatus] ?? 0) - (statusOrder[bStatus] ?? 0);
    });
  }, [coursesResponse, enrollmentMap, isLoggedIn, myEnrollments]);

  // Client-side pagination over the sorted list
  const totalCourses = allSortedCourses.length;
  const totalPages = Math.max(1, Math.ceil(totalCourses / ITEMS_PER_PAGE));
  const courses = useMemo(
    () => allSortedCourses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [allSortedCourses, currentPage]
  );

  // Fetch categories with SWR (cached longer)
  // keepPreviousData prevents flash
  const { data: categories = [], isLoading: categoriesLoading } = useSWR<Category[]>(
    '/categories',
    fetcher,
    { 
      revalidateOnFocus: false,
      keepPreviousData: true,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  // Reset to page 1 when filters change
  const handleFilterChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  // Only show skeleton on truly fresh loads, not navigation between pages
  const showSkeleton = shouldShowSkeleton(coursesLoading, coursesResponse);
  const filtering = isValidating && !showSkeleton;

  // Skeleton loading on initial load only
  if (showSkeleton) {
    return (
      <div className="min-h-screen bg-stone-50">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg animate-pulse" />
              <div>
                <div className="h-7 bg-white/20 rounded w-40 mb-1 animate-pulse" />
                <div className="h-4 bg-white/10 rounded w-24 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Search Skeleton */}
          <SearchBarSkeleton />
          
          {/* Category Filter Skeleton */}
          <CategoryFilterSkeleton />

          {/* Course Cards Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {[...Array(6)].map((_, i) => (
              <CourseCardSkeleton key={i} />
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <BookIcon className="text-white" size={20} />
            </div>
            <h1 className="text-2xl font-bold">الدورات المتاحة</h1>
          </div>
          
          {/* Search */}
          <div className="relative max-w-xl">
            <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
            <input
              type="text"
              placeholder="ابحث عن دورة..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pr-12 pl-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => handleFilterChange('')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === ''
                    ? 'bg-[#c9a227] text-white'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                الكل
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleFilterChange(category.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === category.id
                      ? 'bg-[#c9a227] text-white'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {category.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-opacity duration-200 ${filtering ? 'opacity-50' : 'opacity-100'}`}>
        {courses.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
            <BookIcon className="mx-auto mb-4 text-stone-300" size={48} />
            <p className="text-stone-500">
              {search || selectedCategory 
                ? 'لا توجد نتائج مطابقة للبحث' 
                : 'لا توجد دورات متاحة'}
            </p>
            {(search || selectedCategory) && (
              <button
                onClick={() => { setSearch(''); setSelectedCategory(''); setCurrentPage(1); }}
                className="mt-4 text-[#1a3a2f] font-medium hover:underline"
              >
                إزالة الفلتر
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="mb-4 text-sm text-stone-500">
              عرض {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCourses)} من {totalCourses} دورة
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-lg transition group"
                >
                  <div className="h-40 bg-gradient-to-br from-[#1a3a2f] to-[#2d5a4a] relative">
                    <CourseCoverImage
                      src={course.coverImage}
                      alt={course.title}
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      {course.lifecycle === 'ONGOING' && (
                        <Tooltip text="هذه الدورة تقام وجاهيّاً ويتم إضافة الدروس والمواد فور تسجيلها">
                          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium bg-violet-500 text-white shadow-sm">
                            <SparkleIcon size={14} />
                            وجاهي
                          </span>
                        </Tooltip>
                      )}
                      {enrollmentMap.get(course.id) === 'completed' && (
                        <span className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium bg-[#c9a227] text-white shadow-sm">
                          <AwardIcon size={14} />
                          مكتملة
                        </span>
                      )}
                      {enrollmentMap.get(course.id) === 'enrolled' && (
                        <span className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium bg-blue-500 text-white shadow-sm">
                          <CheckCircleIcon size={14} />
                          مسجّل
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        course.price === 0 || !course.price 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-white text-stone-800'
                      }`}>
                        {course.price === 0 || !course.price ? 'مجاني' : `${course.price} ر.س`}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="mb-2">
                      <span className="text-xs px-2 py-1 bg-stone-100 text-stone-600 rounded">
                        {course.category.title}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-stone-800 mb-2 group-hover:text-[#1a3a2f] transition">
                      {course.title}
                    </h3>
                    {course.description && (
                    <p className="text-stone-600 text-sm mb-4 line-clamp-2">
                      {course.description}
                    </p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-stone-500">
                      <UserIcon size={14} />
                      <span>{course.teacher.name}</span>
                    </div>
                  </div>
                </Link>
              ))}
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
                      // Show first, last, current, and pages around current
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .map((page, index, arr) => {
                      // Add ellipsis if there's a gap
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
