'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Modal from '@/components/Modal';
import { CheckCircleIcon, BookIcon } from '@/components/Icons';
import { Resource } from '@/types/resource';
import { ResourceList } from '@/components/resources';
import ReportErrorButton from '@/components/ReportErrorButton';
import AskQuestionButton from '@/components/AskQuestionButton';
import { showSuccess, showError, TOAST_MESSAGES } from '@/lib/toast';
import PageLoading from '@/components/PageLoading';

// Helper to get user from localStorage
const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

interface Lesson {
  id: string;
  title: string;
  description?: string;
  type: string;
  order: number;
  youtubeUrl?: string;
  textContent?: string;
  durationMinutes?: number;
  resources?: Resource[];
  module?: {
    id: string;
    title: string;
    order: number;
    course?: {
      id: string;
      title: string;
    };
  };
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStudent, setIsStudent] = useState(false);

  useEffect(() => {
    loadLesson();
    const user = getCurrentUser();
    setIsStudent(user?.role === 'STUDENT');
  }, [params.lessonId]);

  const loadLesson = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      // Get lesson and check completion status in parallel
      const [lessonResponse, progressResponse] = await Promise.all([
        api.get(`/lessons/${params.lessonId}`),
        api.get(`/progress/lessons/${params.lessonId}/status`).catch(() => ({ data: { completed: false } })),
      ]);

      setLesson(lessonResponse.data);
      setCompleted(progressResponse.data?.completed || false);
    } catch (error: any) {
      console.error('Failed to load lesson:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      await api.post(`/progress/lessons/${params.lessonId}/complete`);
      setCompleted(true);
      showSuccess(TOAST_MESSAGES.LESSON_COMPLETE);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Failed to mark lesson as complete:', error);
      const errorMsg = error.response?.data?.message || 'فشل في إكمال الدرس';
      setErrorMessage(errorMsg);
      showError(errorMsg);
    }
  };

  if (loading) {
    return (
      <PageLoading 
        title="جاري تحميل الدرس..." 
        icon={<BookIcon className="text-white" size={20} />}
      />
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">الدرس غير موجود</p>
      </div>
    );
  }

  // Extract YouTube video ID
  const getYouTubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    if (url.includes('youtube.com/embed/')) return url;
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    return url;
  };

  const embedUrl = getYouTubeEmbedUrl(lesson.youtubeUrl);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="mb-4 text-primary hover:underline"
        >
          ← العودة
        </button>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">{lesson.title}</h1>

          {embedUrl && (
            <div className="mb-6">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={embedUrl}
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  allowFullScreen
                  frameBorder="0"
                />
              </div>
            </div>
          )}

          {lesson.textContent && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="whitespace-pre-line text-gray-800">{lesson.textContent}</p>
            </div>
          )}

          {lesson.description && (
            <div className="mb-6">
              <p className="text-gray-800">{lesson.description}</p>
            </div>
          )}

          {/* Lesson Resources Section - Only show if resources exist */}
          {lesson.resources && lesson.resources.length > 0 && (
            <div className="mb-6">
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-xl font-bold mb-4 text-gray-800">مواد الدرس</h3>
                <ResourceList
                  resources={lesson.resources}
                  showActions={false}
                />
              </div>
              <div className="border-b border-gray-200 pb-6 mt-6"></div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Main Actions - Right Side (RTL) */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleComplete}
                disabled={completed}
                className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {completed ? <><CheckCircleIcon size={16} className="inline" /> تم الإكمال</> : <><CheckCircleIcon size={16} className="inline" /> إكمال الدرس</>}
              </button>
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition"
              >
                العودة
              </button>
            </div>
            
            {/* Report Error & Ask Question Buttons - Left Side (RTL) */}
            {lesson.module?.course && (
              <div className="flex gap-2">
                {isStudent && (
                  <AskQuestionButton
                    courseId={lesson.module.course.id}
                    courseName={lesson.module.course.title}
                    lessonId={lesson.id}
                    lessonTitle={lesson.title}
                    lessonOrder={lesson.order || 1}
                    moduleOrder={lesson.module.order || 1}
                  />
                )}
                <ReportErrorButton
                  courseId={lesson.module.course.id}
                  courseName={lesson.module.course.title}
                  lessonId={lesson.id}
                  lessonTitle={lesson.title}
                  lessonOrder={lesson.order || 1}
                  moduleOrder={lesson.module.order || 1}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        size="sm"
        showCloseButton={false}
      >
        <div className="text-center py-6">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-xl font-bold text-gray-800 mb-2">
              تم إكمال الدرس بنجاح!
            </p>
          </div>
          <button
            onClick={() => setShowSuccessModal(false)}
            className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition"
          >
            إغلاق
          </button>
        </div>
      </Modal>

      {/* Error Modal */}
      <Modal
        isOpen={!!errorMessage}
        onClose={() => setErrorMessage(null)}
        size="sm"
        showCloseButton={false}
      >
        <div className="text-center py-6">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-800 mb-2">
              {errorMessage}
            </p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition"
          >
            إغلاق
          </button>
        </div>
      </Modal>
    </div>
  );
}

