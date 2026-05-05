'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Resource } from '@/types/resource';
import { ResourceList } from '@/components/resources';

interface Lesson {
  id: string;
  title: string;
  type: string;
  order: number;
  durationMinutes?: number;
  resources?: Resource[];
}

interface ExpandableLessonCardProps {
  lesson: Lesson;
  isCompleted: boolean;
  isEnrolled: boolean;
  courseId: string;
}

export default function ExpandableLessonCard({
  lesson,
  isCompleted,
  isEnrolled,
  courseId,
}: ExpandableLessonCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasResources = lesson.resources && lesson.resources.length > 0;

  const getResourceIndicatorText = (count: number) => {
    if (count === 0) return null;
    if (count === 1) return 'يحتوي على مادة واحدة';
    if (count === 2) return 'يحتوي على مادتين';
    return `يحتوي على ${count} مواد`;
  };

  const resourceIndicator = hasResources ? getResourceIndicatorText(lesson.resources!.length) : null;

  return (
    <div
      className={`rounded-lg transition ${
        isCompleted 
          ? 'bg-green-50 border-2 border-green-200 hover:bg-green-100' 
          : 'bg-gray-50 hover:bg-gray-100 border-2 border-gray-200'
      }`}
    >
      {/* Main Lesson Row */}
      <div
        className="flex justify-between items-center p-4 cursor-pointer"
        onClick={() => hasResources && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-3">
            {isCompleted ? (
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-gray-600 font-semibold">{lesson.order}</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`font-semibold ${isCompleted ? 'text-green-800' : 'text-gray-800'}`}>
                {lesson.title}
              </h4>
              {isCompleted && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                  مكتمل
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              {lesson.durationMinutes && (
                <p className="text-sm text-gray-600">
                  {lesson.durationMinutes} دقيقة
                </p>
              )}
              {resourceIndicator && (
                <p className="text-sm text-teal-600 font-semibold flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  {resourceIndicator}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEnrolled ? (
            <Link
              href={`/courses/${courseId}/lessons/${lesson.id}`}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                isCompleted
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-primary text-white hover:bg-primary-dark'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {isCompleted ? '✓ إعادة المشاهدة' : 'مشاهدة'}
            </Link>
          ) : (
            <span className="text-gray-400">سجل للوصول</span>
          )}
          <button
            className={`p-2 transition ${
              hasResources
                ? 'text-gray-600 hover:text-gray-800 cursor-pointer'
                : 'text-transparent cursor-default pointer-events-none'
            }`}
            aria-label={hasResources ? (isExpanded ? 'إخفاء المواد' : 'إظهار المواد') : ''}
            disabled={!hasResources}
          >
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Resources Section */}
      {isExpanded && hasResources && (
        <div className="px-4 pb-4 border-t border-gray-200">
          <div className="pt-4">
            <h5 className="text-sm font-bold text-gray-700 mb-3">مواد الدرس:</h5>
            <ResourceList
              resources={lesson.resources!}
              showActions={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
