'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { HelpIcon, CheckCircleIcon, ClockIcon, EyeIcon, TrashIcon, FilterIcon, UserIcon } from '@/components/Icons';
import { showSuccess, showError, TOAST_MESSAGES } from '@/lib/toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useConfirmDialog } from '@/lib/useConfirmDialog';
import { formatDate } from '@/lib/utils';
import { Pagination, PaginationInfo, PaginatedResponse } from '@/components/Pagination';
import PageLoading from '@/components/PageLoading';

interface Question {
  id: string;
  question: string;
  answer: string | null;
  status: string;
  createdAt: string;
  answeredAt: string | null;
  student: {
    id: string;
    name: string;
    email: string;
  };
  course: {
    id: string;
    title: string;
    teacherId: string;
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

export default function TeacherQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'ANSWERED'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { confirm, isOpen: confirmOpen, options: confirmOptions, handleConfirm, handleClose: handleConfirmClose } = useConfirmDialog();

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/questions/teacher?page=${currentPage}&limit=${ITEMS_PER_PAGE}`);
      const data = response.data as PaginatedResponse<Question>;
      setQuestions(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalQuestions(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    const interval = setInterval(loadQuestions, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [loadQuestions]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleAnswer = async (questionId: string) => {
    if (!answerText.trim()) {
      showError('يرجى كتابة الإجابة');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/questions/${questionId}/answer`, {
        answer: answerText.trim(),
      });
      setAnsweringId(null);
      setAnswerText('');
      showSuccess(TOAST_MESSAGES.QUESTION_ANSWER_SUCCESS);
      loadQuestions();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل إرسال الإجابة');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    const ok = await confirm({ message: 'هل أنت متأكد من حذف هذا السؤال؟', title: 'حذف السؤال', variant: 'danger' });
    if (!ok) return;

    try {
      await api.delete(`/questions/${questionId}`);
      showSuccess(TOAST_MESSAGES.DELETE_SUCCESS);
      loadQuestions();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل حذف السؤال');
    }
  };

  const filteredQuestions = questions.filter(q => 
    filter === 'all' ? true : q.status === filter
  );

  if (loading && questions.length === 0) {
    return (
      <PageLoading 
        title="الأسئلة" 
        icon={<HelpIcon className="text-white" size={20} />}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <HelpIcon className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold">أسئلة الطلاب</h1>
              <p className="text-white/70 text-sm">الأسئلة المتعلقة بدوراتك</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
            <p className="text-2xl font-bold text-[#1a3a2f]">{totalQuestions}</p>
            <p className="text-sm text-stone-500">إجمالي الأسئلة</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {questions.filter(q => q.status === 'ANSWERED').length}
            </p>
            <p className="text-sm text-stone-500">تم الإجابة</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {questions.filter(q => q.status === 'PENDING').length}
            </p>
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
                onClick={() => setFilter(option.value as any)}
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
                    <div className="flex items-center gap-2 mb-1">
                      <UserIcon size={14} className="text-stone-400" />
                      <p className="font-medium text-stone-800">{question.student.name}</p>
                      <span className="text-xs text-stone-400">({question.student.email})</span>
                    </div>
                    <p className="text-sm text-stone-500">
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
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                    >
                      حذف
                    </button>
                  </div>
                </div>

                {/* Question */}
                <div className="p-4 bg-stone-50 rounded-lg mb-3">
                  <p className="text-sm font-medium text-stone-600 mb-1">السؤال:</p>
                  <p className="text-stone-800 whitespace-pre-wrap">{question.question}</p>
                </div>

                {/* Answer or Answer Form */}
                {question.status === 'ANSWERED' && question.answer ? (
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
                ) : answeringId === question.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      rows={4}
                      placeholder="اكتب الإجابة هنا..."
                      className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f] text-stone-800"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAnswer(question.id)}
                        disabled={submitting}
                        className="px-4 py-2 bg-[#1a3a2f] text-white rounded-lg hover:bg-[#2d5a4a] transition disabled:opacity-50"
                      >
                        {submitting ? 'جاري الإرسال...' : 'إرسال الإجابة'}
                      </button>
                      <button
                        onClick={() => {
                          setAnsweringId(null);
                          setAnswerText('');
                        }}
                        className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAnsweringId(question.id)}
                    className="px-4 py-2 bg-[#1a3a2f] text-white rounded-lg hover:bg-[#2d5a4a] transition text-sm"
                  >
                    الإجابة على السؤال
                  </button>
                )}
              </div>
            ))
          )}
          
          {/* Pagination Controls */}
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
        </div>

        {/* Polling indicator */}
        <div className="mt-6 text-center text-sm text-stone-400">
          يتم تحديث البيانات تلقائياً كل دقيقة
        </div>
      </div>
      <ConfirmDialog isOpen={confirmOpen} onClose={handleConfirmClose} onConfirm={handleConfirm} {...confirmOptions} />
    </div>
  );
}
