'use client';

import { cn } from '@/lib/utils';

/**
 * Base Skeleton component with shimmer animation
 */
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 bg-[length:200%_100%] animate-shimmer rounded',
        className
      )}
    />
  );
}

/**
 * Course Card Skeleton - matches the course card layout
 * Used in: Dashboard, Courses page
 */
export function CourseCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
      {/* Cover Image */}
      <Skeleton className="w-full h-40 rounded-none" />
      
      {/* Content */}
      <div className="p-5">
        {/* Category badge */}
        <Skeleton className="w-20 h-5 rounded-full mb-3" />
        
        {/* Title */}
        <Skeleton className="w-full h-6 mb-2" />
        <Skeleton className="w-3/4 h-6 mb-3" />
        
        {/* Description */}
        <Skeleton className="w-full h-4 mb-1" />
        <Skeleton className="w-5/6 h-4 mb-4" />
        
        {/* Meta info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="w-24 h-4" />
          </div>
          <Skeleton className="w-16 h-4" />
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard Course Card Skeleton - compact version for enrolled courses
 * Used in: Dashboard page enrolled courses section
 */
export function DashboardCourseCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
      {/* Cover Image */}
      <Skeleton className="w-full h-32 rounded-none" />
      
      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <Skeleton className="w-full h-5 mb-2" />
        <Skeleton className="w-2/3 h-5 mb-4" />
        
        {/* Progress section */}
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="w-16 h-4" />
          <Skeleton className="w-20 h-4" />
        </div>
        
        {/* Progress bar */}
        <Skeleton className="w-full h-2 rounded-full mb-4" />
        
        {/* Button */}
        <Skeleton className="w-full h-10 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Exam Card Skeleton - matches the exam card layout
 * Used in: Exams list page
 */
export function ExamCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <Skeleton className="w-3/4 h-6 mb-2" />
          <Skeleton className="w-1/2 h-4" />
        </div>
        <Skeleton className="w-20 h-7 rounded-lg" />
      </div>
      
      {/* Description */}
      <Skeleton className="w-full h-4 mb-1" />
      <Skeleton className="w-4/5 h-4 mb-4" />
      
      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="w-20 h-4" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="w-24 h-4" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="w-16 h-4" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="w-20 h-4" />
        </div>
      </div>
      
      {/* Button */}
      <Skeleton className="w-full h-11 rounded-lg" />
    </div>
  );
}

/**
 * Homework Card Skeleton - matches the homework card layout
 * Used in: Homework list page
 */
export function HomeworkCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <Skeleton className="w-3/4 h-6 mb-2" />
          <Skeleton className="w-1/2 h-4" />
        </div>
        <Skeleton className="w-20 h-7 rounded-lg" />
      </div>
      
      {/* Description */}
      <Skeleton className="w-full h-4 mb-1" />
      <Skeleton className="w-5/6 h-4 mb-4" />
      
      {/* Info rows */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between items-center py-2 border-b border-stone-100">
          <Skeleton className="w-28 h-4" />
          <Skeleton className="w-24 h-4" />
        </div>
        <div className="flex justify-between items-center py-2 border-b border-stone-100">
          <Skeleton className="w-16 h-4" />
          <Skeleton className="w-16 h-4" />
        </div>
        <div className="flex justify-between items-center py-2 border-b border-stone-100">
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-12 h-4" />
        </div>
      </div>
      
      {/* Button */}
      <Skeleton className="w-full h-12 rounded-lg" />
    </div>
  );
}

/**
 * Grade Item Skeleton - matches the grade item layout
 * Used in: Grades list page
 */
export function GradeItemSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Course image */}
        <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="w-16 h-5 rounded" />
            <Skeleton className="w-32 h-5" />
          </div>
          <Skeleton className="w-48 h-4 mb-2" />
          <Skeleton className="w-32 h-3" />
        </div>
        
        {/* Score */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-left">
            <Skeleton className="w-20 h-8 mb-1" />
            <Skeleton className="w-16 h-3" />
          </div>
          <Skeleton className="w-14 h-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Statistics Card Skeleton - for dashboard stat cards
 */
export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div>
          <Skeleton className="w-16 h-8 mb-1" />
          <Skeleton className="w-24 h-4" />
        </div>
      </div>
    </div>
  );
}

/**
 * Navigation Card Skeleton - for dashboard navigation cards
 */
export function NavCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="w-24 h-5 mb-1" />
          <Skeleton className="w-16 h-4" />
        </div>
        <Skeleton className="w-5 h-5 rounded" />
      </div>
    </div>
  );
}

/**
 * Deadline Item Skeleton - for upcoming deadlines section
 */
export function DeadlineItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-stone-100 last:border-0">
      <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
      <div className="flex-1 min-w-0">
        <Skeleton className="w-3/4 h-4 mb-1" />
        <Skeleton className="w-1/2 h-3" />
      </div>
      <div className="text-left shrink-0">
        <Skeleton className="w-20 h-4 mb-1" />
        <Skeleton className="w-16 h-3" />
      </div>
    </div>
  );
}

/**
 * Filter Skeleton - for filter sections
 */
export function FilterSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5 mb-6">
      <Skeleton className="w-24 h-6 mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Skeleton className="w-16 h-4 mb-2" />
          <Skeleton className="w-full h-10 rounded-lg" />
        </div>
        <div>
          <Skeleton className="w-16 h-4 mb-2" />
          <Skeleton className="w-full h-10 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Search Bar Skeleton
 */
export function SearchBarSkeleton() {
  return (
    <div className="mb-4">
      <Skeleton className="w-full h-12 rounded-xl" />
    </div>
  );
}

/**
 * Category Filter Skeleton - horizontal chips
 */
export function CategoryFilterSkeleton() {
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      <Skeleton className="w-16 h-9 rounded-full" />
      <Skeleton className="w-20 h-9 rounded-full" />
      <Skeleton className="w-24 h-9 rounded-full" />
      <Skeleton className="w-18 h-9 rounded-full" />
      <Skeleton className="w-22 h-9 rounded-full" />
    </div>
  );
}

/**
 * Continue Learning Skeleton - for dashboard continue section
 */
export function ContinueLearningCardSkeleton() {
  return (
    <div className="bg-gradient-to-l from-[#1a3a2f] to-[#2d5a4a] rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-white/20 rounded-lg animate-pulse" />
          <div className="flex-1 min-w-0">
            <div className="h-3 bg-white/30 rounded w-32 mb-1 animate-pulse" />
            <div className="h-5 bg-white/20 rounded w-48 animate-pulse" />
          </div>
        </div>
        <div className="w-20 h-9 bg-white/20 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
