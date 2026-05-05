'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { BookIcon, CloseIcon, ExamIcon } from '@/components/Icons';
import { showSuccess, showError, TOAST_MESSAGES } from '@/lib/toast';
import PageLoading from '@/components/PageLoading';
import { Pagination, PaginationInfo } from '@/components/Pagination';

const ITEMS_PER_PAGE = 10;

interface Attempt {
  id: string;
  score: number | null;
  status: string;
  answers: string;
  submittedAt: string;
  attemptNumber: number;
  isRetake: boolean;
  user: { name: string; email: string };
}

interface Exam {
  id: string;
  title: string;
  maxScore: number;
  retakeScorePercent?: number;
  questions: Array<{
    id: string;
    prompt: string;
    type: string;
    points: number;
    choices?: string[];
    correctIndex?: number;
  }>;
}

export default function ExamAttemptsPage() {
  const params = useParams();
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingScore, setEditingScore] = useState<{ [key: string]: number }>({});
  const [bonus, setBonus] = useState<{ [key: string]: number }>({});
  const [questionScores, setQuestionScores] = useState<{ [attemptId: string]: { [questionId: string]: number } }>({});
  const [gradingAttempt, setGradingAttempt] = useState<string | null>(null);
  const [viewingAttempt, setViewingAttempt] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    try {
      const [examRes, attemptsRes] = await Promise.all([
        api.get(`/exams/${params.id}`),
        api.get(`/exams/${params.id}/attempts`).catch(() => ({ data: [] })),
      ]);
      setExam(examRes.data);
      setAttempts(attemptsRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBonus = async (attemptId: string, bonusValue: number) => {
    try {
      await api.patch(`/exams/${params.id}/attempt/${attemptId}`, { bonus: bonusValue });
      setBonus({ ...bonus, [attemptId]: bonusValue });
      showSuccess(TOAST_MESSAGES.SAVE_SUCCESS);
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل إضافة bonus');
    }
  };

  const handleSetFinalScore = async (attemptId: string, finalScore: number) => {
    try {
      if (finalScore > exam!.maxScore * 1.5) {
        showError(`الدرجة النهائية لا يمكن أن تتجاوز ${exam!.maxScore * 1.5}`);
        return;
      }
      await api.patch(`/exams/${params.id}/attempt/${attemptId}`, { finalScore });
      showSuccess(TOAST_MESSAGES.GRADE_SUBMIT_SUCCESS);
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل تحديث الدرجة');
    }
  };

  const handleGradePendingAttempt = async (attemptId: string) => {
    try {
      const scores = questionScores[attemptId] || {};
      const finalScore = editingScore[attemptId];
      
      if (!finalScore && Object.keys(scores).length === 0) {
        showError('يجب إدخال درجات للأسئلة أو الدرجة النهائية');
        return;
      }

      await api.post(`/exams/${params.id}/attempt/${attemptId}/grade`, {
        questionScores: Object.keys(scores).length > 0 ? scores : undefined,
        finalScore: finalScore || undefined,
        bonus: bonus[attemptId] || 0,
      });
      
      setGradingAttempt(null);
      setQuestionScores({ ...questionScores, [attemptId]: {} });
      showSuccess(TOAST_MESSAGES.GRADE_SUBMIT_SUCCESS);
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل تصحيح الامتحان');
    }
  };

  // Client-side pagination
  const totalPages = Math.ceil(attempts.length / ITEMS_PER_PAGE);
  const paginatedAttempts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return attempts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [attempts, currentPage]);

  // Reset to page 1 if current page exceeds total pages after data changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [attempts.length, totalPages, currentPage]);

  if (loading && attempts.length === 0) {
    return <PageLoading title="محاولات الامتحان" icon={<BookIcon className="text-white" size={20} />} />;
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
                <h1 className="text-xl font-bold">{exam?.title}</h1>
                <p className="text-white/70 text-sm">الدرجة الكاملة: {exam?.maxScore}</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
            <p className="text-2xl font-bold text-[#1a3a2f]">{attempts.length}</p>
            <p className="text-sm text-stone-500">إجمالي التقديمات</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {attempts.filter(a => a.status === 'GRADED' || a.status === 'AUTO_GRADED').length}
            </p>
            <p className="text-sm text-stone-500">تم التصحيح</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {attempts.filter(a => a.status === 'PENDING').length}
            </p>
            <p className="text-sm text-stone-500">في الانتظار</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {attempts.filter(a => a.isRetake).length}
            </p>
            <p className="text-sm text-stone-500">إعادة</p>
          </div>
        </div>

        {/* Retake info banner */}
        {attempts.some(a => a.isRetake) && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-orange-500 mt-0.5 text-lg">⚠</span>
            <div className="text-sm text-orange-800">
              <p className="font-medium mb-1">يحتوي هذا الامتحان على محاولات إعادة</p>
              <p className="text-orange-600">
                محاولات الإعادة تُحسب بنسبة {exam?.retakeScorePercent ?? 75}% من درجة الامتحان
              </p>
            </div>
          </div>
        )}

        {/* Attempts Table */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          {attempts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-stone-500">لا توجد محاولات بعد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-stone-600">الطالب</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-stone-600">الحالة</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-stone-600">الدرجة</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-stone-600">Bonus</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-stone-600">الدرجة النهائية</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-stone-600">التاريخ</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-stone-600">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginatedAttempts.map((attempt) => {
                    const currentBonus = bonus[attempt.id] || 0;
                    const isPending = attempt.status === 'PENDING';
                    
                    return (
                      <tr key={attempt.id} className="hover:bg-stone-50">
                        <td className="px-4 py-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-stone-800">{attempt.user.name}</p>
                              {attempt.isRetake && (
                                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold leading-none">
                                  إعادة
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-stone-500">{attempt.user.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              isPending ? 'bg-amber-50 text-amber-700' : 
                              attempt.status === 'GRADED' ? 'bg-emerald-50 text-emerald-700' :
                              'bg-stone-100 text-stone-600'
                            }`}>
                              {isPending ? 'في الانتظار' : attempt.status === 'GRADED' ? 'مصحح' : 'تلقائي'}
                            </span>
                            {attempt.attemptNumber > 1 && (
                              <span className="text-[10px] text-stone-400">
                                م{attempt.attemptNumber}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {attempt.isRetake && attempt.score !== null ? (
                            <div>
                              <span className="font-bold text-stone-800">
                                {Math.round(attempt.score * ((exam?.retakeScorePercent ?? 75) / 100) * 100) / 100} / {exam?.maxScore}
                              </span>
                              <p className="text-xs text-stone-400 mt-0.5">
                                درجة الامتحان: {attempt.score} / {exam?.maxScore}
                              </p>
                            </div>
                          ) : (
                            <span className="font-bold text-stone-800">
                              {attempt.score !== null ? `${attempt.score} / ${exam?.maxScore}` : '-'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={currentBonus}
                              onChange={(e) => setBonus({ ...bonus, [attempt.id]: parseFloat(e.target.value) || 0 })}
                              min="0"
                              step="0.5"
                              className="w-16 px-2 py-1 border border-stone-200 rounded text-sm text-stone-800"
                            />
                            <button
                              onClick={() => handleAddBonus(attempt.id, currentBonus)}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs hover:bg-emerald-100"
                            >
                              حفظ
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editingScore[attempt.id] ?? (attempt.score ?? 0)}
                              onChange={(e) => setEditingScore({ ...editingScore, [attempt.id]: parseFloat(e.target.value) || 0 })}
                              min="0"
                              max={exam!.maxScore * 1.5}
                              step="0.5"
                              className="w-20 px-2 py-1 border border-stone-200 rounded text-sm text-stone-800"
                            />
                            <button
                              onClick={() => handleSetFinalScore(attempt.id, editingScore[attempt.id] ?? (attempt.score ?? 0))}
                              className="px-2 py-1 bg-[#1a3a2f] text-white rounded text-xs hover:bg-[#2d5a4a]"
                            >
                              حفظ
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-600">
                          {formatDate(attempt.submittedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewingAttempt(attempt.id)}
                              className="px-3 py-1 bg-sky-50 text-sky-700 rounded text-xs hover:bg-sky-100"
                            >
                              عرض
                            </button>
                            {isPending && (
                              <button
                                onClick={() => setGradingAttempt(gradingAttempt === attempt.id ? null : attempt.id)}
                                className="px-3 py-1 bg-amber-50 text-amber-700 rounded text-xs hover:bg-amber-100"
                              >
                                {gradingAttempt === attempt.id ? 'إلغاء' : 'تصحيح'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {attempts.length > ITEMS_PER_PAGE && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <PaginationInfo
              currentPage={currentPage}
              limit={ITEMS_PER_PAGE}
              total={attempts.length}
              itemName="محاولة"
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* View Answers Modal */}
      {viewingAttempt && exam && (() => {
        const attempt = attempts.find(a => a.id === viewingAttempt);
        if (!attempt) return null;
        let parsedAnswers: Record<string, any> = {};
        try {
          parsedAnswers = typeof attempt.answers === 'string' ? JSON.parse(attempt.answers) : (attempt.answers || {});
        } catch { parsedAnswers = {}; }
        const sortedQuestions = [...exam.questions].sort((a, b) => (a as any).order - (b as any).order);

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewingAttempt(null)}>
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex justify-between items-center z-10">
                <div>
                  <h2 className="text-lg font-bold text-stone-800">إجابات الطالب</h2>
                  <p className="text-sm text-stone-500">{attempt.user.name} — {attempt.user.email}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      attempt.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                      attempt.status === 'GRADED' ? 'bg-emerald-50 text-emerald-700' :
                      'bg-stone-100 text-stone-600'
                    }`}>
                      {attempt.status === 'PENDING' ? 'في الانتظار' : attempt.status === 'GRADED' ? 'مصحح' : 'تلقائي'}
                    </span>
                    {attempt.score !== null && (
                      <span className="text-sm text-stone-600">الدرجة: {attempt.score} / {exam.maxScore}</span>
                    )}
                    {attempt.isRetake && (
                      <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold">إعادة</span>
                    )}
                  </div>
                </div>
                <button onClick={() => setViewingAttempt(null)} className="p-2 text-stone-400 hover:text-stone-600">
                  <CloseIcon size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {sortedQuestions.map((question, index) => {
                  const userAnswer = parsedAnswers[question.id];
                  const isMC = question.type === 'MULTIPLE_CHOICE';
                  const isCorrect = isMC && userAnswer !== undefined && userAnswer !== null && userAnswer === question.correctIndex;
                  const isWrong = isMC && userAnswer !== undefined && userAnswer !== null && userAnswer !== question.correctIndex;

                  // Parse choices
                  let choices: string[] = [];
                  if (question.choices) {
                    if (typeof question.choices === 'string') {
                      try { choices = JSON.parse(question.choices as string); } catch { choices = []; }
                    } else if (Array.isArray(question.choices)) {
                      choices = question.choices;
                    }
                  }

                  return (
                    <div key={question.id} className={`bg-white rounded-xl border p-5 ${
                      isCorrect ? 'border-emerald-200' : isWrong ? 'border-red-200' : 'border-stone-200'
                    }`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start gap-3">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                            isCorrect ? 'bg-emerald-100 text-emerald-700' : isWrong ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-700'
                          }`}>{index + 1}</span>
                          <div>
                            <p className="text-stone-800 font-medium whitespace-pre-wrap">{question.prompt}</p>
                            <p className="text-xs text-stone-500 mt-1">{question.points} نقطة — {isMC ? 'اختيار من متعدد' : question.type === 'TEXT' ? 'نصي' : 'مقالي'}</p>
                          </div>
                        </div>
                        {isMC && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            isCorrect ? 'bg-emerald-100 text-emerald-700' : isWrong ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-600'
                          }`}>
                            {isCorrect ? 'صحيح' : isWrong ? 'خطأ' : 'لم يُجب'}
                          </span>
                        )}
                      </div>

                      {/* MC choices */}
                      {isMC && choices.length > 0 && (
                        <div className="space-y-2 mr-11">
                          {choices.map((choice, ci) => {
                            const isUser = userAnswer === ci;
                            const isCorrectChoice = question.correctIndex === ci;
                            let bg = 'bg-stone-50 border-stone-200';
                            let txt = 'text-stone-700';
                            if (isUser && isCorrectChoice) { bg = 'bg-emerald-50 border-emerald-300'; txt = 'text-emerald-800'; }
                            else if (isUser && !isCorrectChoice) { bg = 'bg-red-50 border-red-300'; txt = 'text-red-800'; }
                            return (
                              <div key={ci} className={`flex items-center justify-between p-3 border rounded-lg ${bg}`}>
                                <span className={`font-medium ${txt}`}>{choice}</span>
                                <div className="flex items-center gap-2">
                                  {isUser && isCorrectChoice && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">إجابة الطالب ✓</span>}
                                  {isUser && !isCorrectChoice && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">إجابة الطالب</span>}
                                  {isCorrectChoice && !isUser && <span className="text-xs text-stone-500 px-2 py-1">✓ الإجابة الصحيحة</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Text / Essay */}
                      {(question.type === 'TEXT' || question.type === 'ESSAY') && (
                        <div className="mr-11">
                          <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg">
                            <p className="text-xs text-stone-500 mb-1">إجابة الطالب:</p>
                            <p className="text-stone-800 whitespace-pre-wrap">{userAnswer || '(لم يُجب)'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Grading Modal */}
      {gradingAttempt && exam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-stone-800">تصحيح الامتحان</h2>
              <button onClick={() => setGradingAttempt(null)} className="p-2 text-stone-400 hover:text-stone-600">
                <CloseIcon size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg flex items-start gap-3">
                <span className="text-sky-500 mt-0.5">ℹ</span>
                <div className="text-sm text-sky-800">
                  <p className="font-medium">الأسئلة المعروضة أدناه تحتاج تصحيح يدوي (نصية / مقالية)</p>
                  <p className="text-sky-600 mt-1">أسئلة الاختيار من متعدد تم تصحيحها تلقائياً ولا تظهر هنا</p>
                </div>
              </div>

              {exam.questions
                .filter(q => q.type === 'TEXT' || q.type === 'ESSAY')
                .map((question) => {
                  const attempt = attempts.find(a => a.id === gradingAttempt);
                  const answer = attempt ? JSON.parse(attempt.answers)[question.id] : '';
                  const currentScore = questionScores[gradingAttempt]?.[question.id] || 0;
                  
                  return (
                    <div key={question.id} className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                      <p className="font-medium text-stone-800 mb-2">{question.prompt}</p>
                      <p className="text-xs text-stone-500 mb-3">الدرجة الكاملة: {question.points}</p>
                      <div className="p-3 bg-white rounded border border-stone-200 mb-3">
                        <p className="text-xs text-stone-500 mb-1">إجابة الطالب:</p>
                        <p className="text-stone-800 whitespace-pre-wrap">{answer || 'لم يتم الإجابة'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-stone-600">الدرجة:</label>
                        <input
                          type="number"
                          min="0"
                          max={question.points}
                          value={currentScore}
                          onChange={(e) => {
                            const newScores = { ...questionScores };
                            if (!newScores[gradingAttempt]) newScores[gradingAttempt] = {};
                            newScores[gradingAttempt][question.id] = parseFloat(e.target.value) || 0;
                            setQuestionScores(newScores);
                          }}
                          className="w-20 px-2 py-1 border border-stone-200 rounded text-sm"
                        />
                        <span className="text-sm text-stone-500">/ {question.points}</span>
                      </div>
                    </div>
                  );
                })}
              
              <button
                onClick={() => handleGradePendingAttempt(gradingAttempt)}
                className="w-full px-4 py-3 bg-[#1a3a2f] text-white rounded-lg font-medium hover:bg-[#2d5a4a] transition"
              >
                حفظ التصحيح
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
