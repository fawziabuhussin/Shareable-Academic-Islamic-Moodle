'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { LinkIcon, BookIcon } from '@/components/Icons';
import { showSuccess, showError, TOAST_MESSAGES } from '@/lib/toast';
import { formatDateTime } from '@/lib/utils';
import PageLoading from '@/components/PageLoading';
import { Pagination, PaginationInfo } from '@/components/Pagination';

const ITEMS_PER_PAGE = 10;

interface Submission {
  id: string;
  content: string;
  fileUrl?: string;
  score?: number;
  feedback?: string;
  submittedAt: string;
  gradedAt?: string;
  user: { name: string; email: string };
}

interface Homework {
  id: string;
  title: string;
  description: string;
  maxScore: number;
  courseId: string;
}

export default function HomeworkSubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const [homework, setHomework] = useState<Homework | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingScore, setEditingScore] = useState<{ [key: string]: number }>({});
  const [editingFeedback, setEditingFeedback] = useState<{ [key: string]: string }>({});
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    try {
      // First fetch homework to get courseId
      const homeworkRes = await api.get(`/homework/${params.id}`);
      setHomework(homeworkRes.data);
      
      // Then fetch submissions with courseId
      const submissionsRes = await api.get(
        `/homework/${params.id}/submissions?courseId=${homeworkRes.data.courseId}`
      ).catch(() => ({ data: [] }));
      
      setSubmissions(submissionsRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async (submissionId: string) => {
    try {
      const score = editingScore[submissionId];
      const feedback = editingFeedback[submissionId] || '';

      if (score === undefined || score < 0 || score > homework!.maxScore) {
        showError(`الدرجة يجب أن تكون بين 0 و ${homework!.maxScore}`);
        return;
      }

      await api.post(`/homework/${params.id}/grade/${submissionId}`, {
        score,
        feedback,
        courseId: homework!.courseId,
      });

      const newEditingScore = { ...editingScore };
      const newEditingFeedback = { ...editingFeedback };
      delete newEditingScore[submissionId];
      delete newEditingFeedback[submissionId];
      setEditingScore(newEditingScore);
      setEditingFeedback(newEditingFeedback);

      showSuccess(TOAST_MESSAGES.GRADE_SUBMIT_SUCCESS);
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل تصحيح الواجب');
    }
  };

  // Client-side pagination
  const totalPages = Math.ceil(submissions.length / ITEMS_PER_PAGE);
  const paginatedSubmissions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return submissions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [submissions, currentPage]);

  // Reset to page 1 if current page exceeds total pages after data changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [submissions.length, totalPages, currentPage]);

  if (loading && submissions.length === 0) {
    return <PageLoading title="التسليمات" icon={<BookIcon className="text-white" size={20} />} />;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <BookIcon className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold">{homework?.title}</h1>
                <p className="text-white/70 text-sm">الدرجة الكاملة: {homework?.maxScore}</p>
              </div>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition text-sm"
            >
              العودة
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
            <p className="text-2xl font-bold text-[#1a3a2f]">{submissions.length}</p>
            <p className="text-sm text-stone-500">إجمالي الإجابات</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {submissions.filter(s => s.score !== null && s.score !== undefined).length}
            </p>
            <p className="text-sm text-stone-500">تم التصحيح</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {submissions.filter(s => s.score === null || s.score === undefined).length}
            </p>
            <p className="text-sm text-stone-500">في الانتظار</p>
          </div>
        </div>

        {/* Submissions */}
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
              <p className="text-stone-500">لا توجد إجابات بعد</p>
            </div>
          ) : (
            paginatedSubmissions.map((submission) => {
              const isGraded = submission.score !== null && submission.score !== undefined;
              const currentScore = editingScore[submission.id] ?? submission.score ?? 0;
              const currentFeedback = editingFeedback[submission.id] ?? submission.feedback ?? '';

              return (
                <div key={submission.id} className="bg-white rounded-xl border border-stone-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-stone-800">{submission.user.name}</h3>
                      <p className="text-sm text-stone-500">{submission.user.email}</p>
                      <p className="text-xs text-stone-400 mt-2">
                        تم الإرسال: <span dir="ltr">{formatDateTime(submission.submittedAt)}</span>
                      </p>
                      {isGraded && submission.gradedAt && (
                        <p className="text-xs text-emerald-600 mt-1">
                          تم التصحيح: <span dir="ltr">{formatDateTime(submission.gradedAt)}</span>
                        </p>
                      )}
                    </div>
                    {isGraded && (
                      <div className="text-left">
                        <div className="text-2xl font-bold text-[#1a3a2f]">
                          {submission.score} / {homework?.maxScore}
                        </div>
                        <div className="text-xs text-stone-500">
                          {((submission.score! / homework!.maxScore) * 100).toFixed(1)}%
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mb-4 p-4 bg-stone-50 rounded-lg border border-stone-200">
                    <h4 className="text-sm font-medium mb-2 text-stone-600">الإجابة:</h4>
                    <div className="text-stone-800 whitespace-pre-wrap">{submission.content}</div>
                    {submission.fileUrl && (
                      <div className="mt-3">
                        <a
                          href={submission.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1a3a2f] hover:underline text-sm flex items-center gap-1"
                        >
                          <LinkIcon size={14} /> فتح الملف المرفق
                        </a>
                      </div>
                    )}
                  </div>

                  {submission.feedback && (
                    <div className="mb-4 p-4 bg-stone-100 rounded-lg">
                      <h4 className="text-sm font-medium mb-2 text-stone-600">التعليقات:</h4>
                      <div className="text-stone-800 whitespace-pre-wrap">{submission.feedback}</div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-stone-700">الدرجة</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={currentScore}
                          onChange={(e) =>
                            setEditingScore({ ...editingScore, [submission.id]: parseFloat(e.target.value) || 0 })
                          }
                          min="0"
                          max={homework!.maxScore}
                          step="0.5"
                          className="w-24 px-3 py-2 border border-stone-200 rounded-lg text-stone-800"
                        />
                        <span className="text-stone-600">/ {homework?.maxScore}</span>
                        {currentScore > 0 && (
                          <span className="text-sm text-stone-500">
                            ({((currentScore / homework!.maxScore) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-stone-700">التعليقات (اختياري)</label>
                      <textarea
                        value={currentFeedback}
                        onChange={(e) =>
                          setEditingFeedback({ ...editingFeedback, [submission.id]: e.target.value })
                        }
                        rows={3}
                        className="w-full px-4 py-3 border border-stone-200 rounded-lg text-stone-800"
                        placeholder="اكتب تعليقاتك هنا..."
                      />
                    </div>

                    <button
                      onClick={() => handleGrade(submission.id)}
                      className="px-6 py-2 bg-[#1a3a2f] text-white rounded-lg font-medium hover:bg-[#2d5a4a] transition"
                    >
                      {isGraded ? 'تحديث التصحيح' : 'تصحيح الواجب'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {submissions.length > ITEMS_PER_PAGE && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <PaginationInfo
              currentPage={currentPage}
              limit={ITEMS_PER_PAGE}
              total={submissions.length}
              itemName="تسليم"
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
