'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { HelpIcon, CheckCircleIcon, ClockIcon, EyeIcon, TrashIcon, FilterIcon } from '@/components/Icons';
import { Pagination, PaginationInfo, PaginatedResponse } from '@/components/Pagination';
import { showSuccess, showError } from '@/lib/toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useConfirmDialog } from '@/lib/useConfirmDialog';
import { formatDate } from '@/lib/utils';

interface Question {
  id: string;
  question: string;
  answer: string | null;
  status: string;
  createdAt: string;
  answeredAt: string | null;
  course: {
    id: string;
    title: string;
  };
  lesson: {
    id: string;
    title: string;
    order: number;
    module: {
      id: string;
      title: string;
      order: number;
    };
  };
  answeredBy?: {
    id: string;
    name: string;
  } | null;
}

const POLLING_INTERVAL = 60000; // 1 minute
const ITEMS_PER_PAGE = 15;

export default function StudentQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'ANSWERED'>('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [stats, setStats] = useState({ total: 0, answered: 0, pending: 0 });
  const hasLoadedOnce = useRef(false);
  const { confirm, isOpen: confirmOpen, options: confirmOptions, handleConfirm, handleClose: handleConfirmClose } = useConfirmDialog();

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/questions/my?page=${currentPage}&limit=${ITEMS_PER_PAGE}`);
      const data = response.data as PaginatedResponse<Question>;
      
      setQuestions(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalQuestions(data.pagination?.total || 0);
      // Keep total in sync from API; answered/pending stay from loadStats (full list)
      setStats((prev) => ({ ...prev, total: data.pagination?.total ?? prev.total }));
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
      hasLoadedOnce.current = true;
    }
  }, [currentPage]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    const interval = setInterval(loadQuestions, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [loadQuestions]);

  // Load stats (full list counts) - call after delete so cards stay in sync
  const loadStats = useCallback(async () => {
    try {
      const response = await api.get('/questions/my');
      const allQuestions = response.data || [];
      setStats({
        total: allQuestions.length,
        answered: allQuestions.filter((q: Question) => q.status === 'ANSWERED').length,
        pending: allQuestions.filter((q: Question) => q.status === 'PENDING').length,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleDelete = async (questionId: string) => {
    const ok = await confirm({ message: 'هل أنت متأكد من حذف هذا السؤال؟', title: 'حذف السؤال', variant: 'danger' });
    if (!ok) return;

    setDeleting(questionId);
    try {
      await api.delete(`/questions/${questionId}`);
      showSuccess('تم حذف السؤال بنجاح');
      await loadQuestions();
      await loadStats();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل حذف السؤال');
    } finally {
      setDeleting(null);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (newFilter: 'all' | 'PENDING' | 'ANSWERED') => {
    setFilter(newFilter);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Client-side filter (server doesn't support status filter on /my endpoint)
  const filteredQuestions = questions.filter(q => 
    filter === 'all' ? true : q.status === filter
  );

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header - always visible to prevent flash */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <HelpIcon className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold">أسئلتي</h1>
              <p className="text-white/70 text-sm">الأسئلة التي طرحتها على المدرسين</p>
            </div>
          </div>
        </div>
      </div>

      {/* Show loading inside content area, not as full page replacement */}
      {loading && !hasLoadedOnce.current ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1a3a2f]"></div>
        </div>
      ) : (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
                <p className="text-2xl font-bold text-[#1a3a2f]">{stats.total}</p>
                <p className="text-sm text-stone-500">إجمالي الأسئلة</p>
              </div>
              <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{stats.answered}</p>
                <p className="text-sm text-stone-500">تم الإجابة</p>
              </div>
              <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                <p className="text-sm text-stone-500">في الانتظار</p>
              </div>
            </div>

            {/* Filter */}
            <div className="bg-white rounded-xl border border-stone-200 p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <FilterIcon size={18} className="text-stone-500" />
                <span className="text-sm font-medium text-stone-700">تصفية</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'all', label: 'الكل' },
                  { value: 'PENDING', label: 'في الانتظار' },
                  { value: 'ANSWERED', label: 'تم الإجابة' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterChange(option.value as any)}
                    className={`px-4 py-2 rounded-lg text-sm transition ${
                      filter === option.value
                        ? 'bg-[#1a3a2f] text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {filteredQuestions.length === 0 ? (
                <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
                  <HelpIcon className="mx-auto mb-4 text-stone-300" size={48} />
                  <p className="text-stone-500">لا توجد أسئلة</p>
                </div>
              ) : (
                filteredQuestions.map((question) => (
                  <div key={question.id} className="bg-white rounded-xl border border-stone-200 p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            question.status === 'ANSWERED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {question.status === 'ANSWERED' ? 'تم الإجابة' : 'في الانتظار'}
                          </span>
                          <span className="text-xs text-stone-400">
                            {formatDate(question.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-stone-500 mb-1">
                          {question.course.title} - {question.lesson.module.order}.{question.lesson.order} {question.lesson.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/courses/${question.course.id}/lessons/${question.lesson.id}`}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100 transition text-sm font-medium"
                          title="عرض الدرس"
                        >
                          عرض الدرس
                        </Link>
                        <button
                          onClick={() => handleDelete(question.id)}
                          disabled={deleting === question.id}
                          className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium disabled:opacity-50"
                        >
                          حذف
                        </button>
                      </div>
                    </div>

                    {/* Question */}
                    <div className="p-4 bg-stone-50 rounded-lg mb-3">
                      <p className="text-sm font-medium text-stone-600 mb-1">سؤالك:</p>
                      <p className="text-stone-800 whitespace-pre-wrap">{question.question}</p>
                    </div>

                    {/* Answer */}
                    {question.status === 'ANSWERED' && question.answer && (
                      <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircleIcon className="text-emerald-600" size={16} />
                          <p className="text-sm font-medium text-emerald-700">
                            الإجابة {question.answeredBy && `من ${question.answeredBy.name}`}
                          </p>
                        </div>
                        <p className="text-stone-800 whitespace-pre-wrap">{question.answer}</p>
                        {question.answeredAt && (
                          <p className="text-xs text-emerald-600 mt-2">
                            {formatDate(question.answeredAt)}
                          </p>
                        )}
                      </div>
                    )}

                    {question.status === 'PENDING' && (
                      <div className="flex items-center gap-2 text-amber-600 text-sm">
                        <ClockIcon size={16} />
                        <span>في انتظار الإجابة من المدرس</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <PaginationInfo
                  currentPage={currentPage}
                  limit={ITEMS_PER_PAGE}
                  total={totalQuestions}
                  itemName="سؤال"
                />
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}

            {/* Polling indicator */}
            <div className="mt-6 text-center text-sm text-stone-400">
              يتم تحديث البيانات تلقائياً كل دقيقة
            </div>
          </div>
        </>
      )}
      <ConfirmDialog isOpen={confirmOpen} onClose={handleConfirmClose} onConfirm={handleConfirm} {...confirmOptions} />
    </div>
  );
}
