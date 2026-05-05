'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { CheckCircleIcon, AlertIcon, TrashIcon, PlusIcon, CloseIcon, BookIcon, EditIcon } from '@/components/Icons';
import PageLoading from '@/components/PageLoading';
import { showError, showWarning, showSuccess } from '@/lib/toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useConfirmDialog } from '@/lib/useConfirmDialog';
import { toDirectImageUrl } from '@/lib/utils';
import ImageLightbox from '@/components/ImageLightbox';

interface QuestionImage {
  id?: string;
  imageUrl: string;
  order: number;
}

interface Question {
  id: string;
  prompt: string;
  type?: 'MULTIPLE_CHOICE' | 'TEXT' | 'ESSAY';
  choices?: string[];
  correctIndex?: number;
  explanation?: string;
  images?: QuestionImage[];
  points: number;
  order: number;
}

interface Exam {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  startDate: string;
  endDate: string;
  questions: Question[];
  maxScore: number;
}

export default function ExamDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [questionData, setQuestionData] = useState({
    prompt: '',
    type: 'MULTIPLE_CHOICE' as 'MULTIPLE_CHOICE' | 'TEXT' | 'ESSAY',
    choices: ['', '', '', ''],
    correctIndex: 0,
    explanation: '',
    images: [] as { imageUrl: string; order: number }[],
    points: 1,
    allowBonus: false,
  });
  const [totalPoints, setTotalPoints] = useState(0);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
  });
  const [saving, setSaving] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQuestionData, setEditQuestionData] = useState<{
    prompt: string;
    type: 'MULTIPLE_CHOICE' | 'TEXT' | 'ESSAY';
    choices: string[];
    correctIndex: number;
    explanation: string;
    images: { imageUrl: string; order: number }[];
    points: number;
  }>({
    prompt: '',
    type: 'MULTIPLE_CHOICE',
    choices: ['', '', '', ''],
    correctIndex: 0,
    explanation: '',
    images: [],
    points: 1,
  });
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [moveTargets, setMoveTargets] = useState<Record<string, number>>({});
  const [movingQuestionId, setMovingQuestionId] = useState<string | null>(null);
  const { confirm, isOpen: confirmOpen, options: confirmOptions, handleConfirm, handleClose: handleConfirmClose } = useConfirmDialog();

  useEffect(() => {
    loadExam();
  }, [params.id]);

  const loadExam = async () => {
    try {
      const response = await api.get(`/exams/${params.id}`);
      const examData = response.data;
      examData.questions = examData.questions.map((q: any) => ({
        ...q,
        type: q.type || 'MULTIPLE_CHOICE',
        choices: q.choices ? (typeof q.choices === 'string' ? JSON.parse(q.choices) : q.choices) : undefined,
      }));
      setExam(examData);
      calculateTotalPoints(examData.questions);
    } catch (error) {
      console.error('Failed to load exam:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPoints = (questions: Question[]) => {
    const total = questions.reduce((sum, q) => sum + q.points, 0);
    setTotalPoints(total);
  };

  const openEditForm = () => {
    if (!exam) return;
    const toLocalDatetime = (iso: string) => {
      const d = new Date(iso);
      const offset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - offset * 60000);
      return local.toISOString().slice(0, 16);
    };
    setEditData({
      title: exam.title,
      description: exam.description || '',
      startDate: exam.startDate ? toLocalDatetime(exam.startDate) : '',
      endDate: exam.endDate ? toLocalDatetime(exam.endDate) : '',
    });
    setShowEditForm(true);
  };

  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {};
      if (editData.title.trim()) payload.title = editData.title.trim();
      if (editData.description !== undefined) payload.description = editData.description.trim() || null;
      if (editData.startDate) payload.startDate = new Date(editData.startDate).toISOString();
      if (editData.endDate) payload.endDate = new Date(editData.endDate).toISOString();

      await api.put(`/exams/${params.id}`, payload);
      showSuccess('تم تحديث الامتحان بنجاح');
      setShowEditForm(false);
      loadExam();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل تحديث الامتحان');
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (questionData.type === 'MULTIPLE_CHOICE') {
        const validChoices = questionData.choices.filter(c => c.trim() !== '');
        if (validChoices.length < 2) {
          showWarning('يجب إضافة خيارين على الأقل لسؤال الاختيار من متعدد');
          return;
        }
        if (questionData.correctIndex === undefined || questionData.correctIndex < 0) {
          showWarning('يجب تحديد الإجابة الصحيحة');
          return;
        }
      }

      if (!questionData.prompt.trim()) {
        showWarning('يجب إدخال نص السؤال');
        return;
      }

      const newTotal = totalPoints + questionData.points;
      if (newTotal > exam!.maxScore && !questionData.allowBonus) {
        const confirmBonus = await confirm({
          message: `المجموع الكلي (${newTotal}) يتجاوز الدرجة الكاملة (${exam!.maxScore}). هل تريد المتابعة كسؤال إضافي (bonus)?`,
          title: 'تجاوز الدرجة الكاملة',
          variant: 'warning',
          confirmText: 'متابعة',
        });
        if (!confirmBonus) return;
        questionData.allowBonus = true;
      }

      const requestData: any = {
        ...questionData,
        allowBonus: questionData.allowBonus,
        images: questionData.images.filter(img => img.imageUrl.trim()),
      };
      
      if (questionData.type === 'MULTIPLE_CHOICE') {
        const validChoices = questionData.choices.filter(c => c.trim() !== '');
        requestData.choices = validChoices;
        requestData.correctIndex = questionData.correctIndex ?? 0;
        requestData.explanation = questionData.explanation?.trim() || undefined;
      } else {
        requestData.choices = undefined;
        requestData.correctIndex = undefined;
        requestData.explanation = questionData.explanation?.trim() || undefined;
      }
      
      await api.post(`/exams/${params.id}/questions`, requestData);
      setShowQuestionForm(false);
      setQuestionData({ 
        prompt: '', 
        type: 'MULTIPLE_CHOICE',
        choices: ['', '', '', ''], 
        correctIndex: 0,
        explanation: '',
        images: [],
        points: 1, 
        allowBonus: false 
      });
      loadExam();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'فشل إضافة السؤال';
      showError(errorMsg);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    const ok = await confirm({ message: 'هل أنت متأكد من حذف هذا السؤال؟', title: 'حذف السؤال', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/exams/${params.id}/questions/${questionId}`);
      loadExam();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل حذف السؤال');
    }
  };

  const handleMoveQuestion = async (questionId: string) => {
    const newPos = moveTargets[questionId];
    if (!newPos || !exam) return;
    setMovingQuestionId(questionId);
    try {
      await api.patch(`/exams/${params.id}/reorder-questions`, {
        questionId,
        newPosition: newPos,
      });
      setMoveTargets(prev => { const copy = { ...prev }; delete copy[questionId]; return copy; });
      loadExam();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل نقل السؤال');
    } finally {
      setMovingQuestionId(null);
    }
  };

  const openEditQuestion = (question: Question) => {
    setEditingQuestionId(question.id);
    setEditQuestionData({
      prompt: question.prompt,
      type: question.type || 'MULTIPLE_CHOICE',
      choices: question.choices ? [...question.choices] : ['', '', '', ''],
      correctIndex: question.correctIndex ?? 0,
      explanation: question.explanation || '',
      images: (question.images || []).map(img => ({ imageUrl: img.imageUrl, order: img.order })),
      points: question.points,
    });
  };

  const handleSaveQuestion = async (questionId: string) => {
    if (!editQuestionData.prompt.trim()) {
      showWarning('يجب إدخال نص السؤال');
      return;
    }
    if (editQuestionData.type === 'MULTIPLE_CHOICE') {
      const validChoices = editQuestionData.choices.filter(c => c.trim() !== '');
      if (validChoices.length < 2) {
        showWarning('يجب إضافة خيارين على الأقل');
        return;
      }
    }

    setSavingQuestion(true);
    try {
      const currentQuestion = exam!.questions.find(q => q.id === questionId)!;
      const newTotal = totalPoints - currentQuestion.points + editQuestionData.points;
      let allowBonus = false;
      if (newTotal > exam!.maxScore) {
        const ok = await confirm({
          message: `المجموع الكلي (${newTotal}) يتجاوز الدرجة الكاملة (${exam!.maxScore}). هل تريد المتابعة؟`,
          title: 'تجاوز الدرجة الكاملة',
          variant: 'warning',
          confirmText: 'متابعة',
        });
        if (!ok) { setSavingQuestion(false); return; }
        allowBonus = true;
      }

      const payload: any = {
        prompt: editQuestionData.prompt.trim(),
        type: editQuestionData.type,
        points: editQuestionData.points,
        explanation: editQuestionData.explanation?.trim() || undefined,
        images: editQuestionData.images.filter(img => img.imageUrl.trim()),
        allowBonus,
      };
      if (editQuestionData.type === 'MULTIPLE_CHOICE') {
        payload.choices = editQuestionData.choices.filter(c => c.trim() !== '');
        payload.correctIndex = editQuestionData.correctIndex;
      } else {
        payload.choices = undefined;
        payload.correctIndex = undefined;
      }

      await api.put(`/exams/${params.id}/questions/${questionId}`, payload);
      showSuccess('تم تحديث السؤال بنجاح');
      setEditingQuestionId(null);
      loadExam();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل تحديث السؤال');
    } finally {
      setSavingQuestion(false);
    }
  };

  if (loading && !exam) {
    return <PageLoading title="تفاصيل الامتحان" icon={<BookIcon className="text-white" size={20} />} />;
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-xl text-stone-600">الامتحان غير موجود</p>
      </div>
    );
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
                <h1 className="text-xl font-bold">{exam.title}</h1>
                {exam.description && (
                  <p className="text-white/70 text-sm">{exam.description}</p>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={openEditForm}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition text-sm flex items-center gap-2"
              >
                <EditIcon size={16} className="text-white" />
                تعديل
              </button>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition text-sm"
              >
                العودة
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Edit Exam Form */}
        {showEditForm && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-stone-800">تعديل الامتحان</h3>
              <button onClick={() => setShowEditForm(false)} className="p-2 text-stone-400 hover:text-stone-600 transition">
                <CloseIcon size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateExam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-stone-700">عنوان الامتحان</label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f] focus:border-transparent bg-white text-stone-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-stone-700">الوصف</label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f] focus:border-transparent bg-white text-stone-800"
                  placeholder="وصف الامتحان (اختياري)"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-stone-700">تاريخ ووقت البدء</label>
                  <input
                    type="datetime-local"
                    value={editData.startDate}
                    onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                    className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f] focus:border-transparent bg-white text-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-stone-700">تاريخ ووقت الانتهاء</label>
                  <input
                    type="datetime-local"
                    value={editData.endDate}
                    onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                    className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f] focus:border-transparent bg-white text-stone-800"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-[#1a3a2f] text-white rounded-lg hover:bg-[#2d5a4a] transition disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="px-6 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stats Card */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-center px-4 py-2 bg-stone-50 rounded-lg">
                <p className="text-2xl font-bold text-[#1a3a2f]">{totalPoints}</p>
                <p className="text-xs text-stone-500">مجموع النقاط</p>
              </div>
              <div className="text-center px-4 py-2 bg-stone-50 rounded-lg">
                <p className="text-2xl font-bold text-[#1a3a2f]">{exam.maxScore}</p>
                <p className="text-xs text-stone-500">الدرجة الكاملة</p>
              </div>
              <div className="text-center px-4 py-2 bg-stone-50 rounded-lg">
                <p className="text-2xl font-bold text-[#1a3a2f]">{exam.questions.length}</p>
                <p className="text-xs text-stone-500">عدد الأسئلة</p>
              </div>
              {totalPoints > exam.maxScore && (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
                  يحتوي على أسئلة إضافية
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Link
                href={`/admin/exams/${params.id}/attempts`}
                className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition text-sm"
              >
                عرض المحاولات
              </Link>
              <button
                onClick={() => setShowQuestionForm(!showQuestionForm)}
                className="px-4 py-2 bg-[#1a3a2f] text-white rounded-lg hover:bg-[#2d5a4a] transition text-sm flex items-center gap-2"
              >
                <PlusIcon size={16} />
                إضافة سؤال
              </button>
            </div>
          </div>
        </div>

        {/* Add Question Form */}
        {showQuestionForm && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-stone-800">سؤال جديد</h3>
              <button
                onClick={() => setShowQuestionForm(false)}
                className="p-2 text-stone-400 hover:text-stone-600 transition"
              >
                <CloseIcon size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-stone-700">نص السؤال</label>
                <textarea
                  value={questionData.prompt}
                  onChange={(e) => setQuestionData({ ...questionData, prompt: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f] focus:border-transparent bg-white text-stone-800"
                  placeholder="اكتب السؤال هنا..."
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium mb-2 text-stone-700">نوع السؤال</label>
                <button
                  type="button"
                  onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                  className="w-full px-4 py-3 border border-stone-200 rounded-lg bg-white text-stone-800 text-right flex items-center justify-between"
                >
                  <span>
                    {questionData.type === 'MULTIPLE_CHOICE' && 'اختيار من متعدد (تصحيح تلقائي)'}
                    {questionData.type === 'TEXT' && 'سؤال نصي قصير (تصحيح يدوي)'}
                    {questionData.type === 'ESSAY' && 'سؤال مقالي (تصحيح يدوي)'}
                  </span>
                  <svg 
                    className={`w-5 h-5 transition-transform ${typeDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {typeDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setTypeDropdownOpen(false)} />
                    <div className="absolute z-20 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden">
                      {[
                        { value: 'MULTIPLE_CHOICE', label: 'اختيار من متعدد (تصحيح تلقائي)' },
                        { value: 'TEXT', label: 'سؤال نصي قصير (تصحيح يدوي)' },
                        { value: 'ESSAY', label: 'سؤال مقالي (تصحيح يدوي)' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setQuestionData({
                              ...questionData,
                              type: option.value as any,
                              choices: option.value === 'MULTIPLE_CHOICE' ? ['', '', '', ''] : [],
                              correctIndex: option.value === 'MULTIPLE_CHOICE' ? 0 : undefined as any,
                            });
                            setTypeDropdownOpen(false);
                          }}
                          className={`w-full text-right px-4 py-3 hover:bg-stone-50 transition ${
                            questionData.type === option.value ? 'bg-[#1a3a2f] text-white' : 'text-stone-800'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                
                <p className="text-xs text-stone-500 mt-2 flex items-center gap-1">
                  {questionData.type === 'MULTIPLE_CHOICE' 
                    ? <><CheckCircleIcon size={12} className="text-emerald-600" /> سيتم التصحيح تلقائياً</>
                    : <><AlertIcon size={12} className="text-amber-600" /> يحتاج تصحيح يدوي</>}
                </p>
              </div>

              {questionData.type === 'MULTIPLE_CHOICE' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-stone-700">الخيارات</label>
                    {questionData.choices.map((choice, index) => (
                      <div key={index} className="mb-2 flex items-center gap-3">
                        <input
                          type="radio"
                          name="correct"
                          checked={questionData.correctIndex === index}
                          onChange={() => setQuestionData({ ...questionData, correctIndex: index })}
                          className="w-4 h-4 text-[#1a3a2f] cursor-pointer"
                        />
                        <input
                          type="text"
                          value={choice}
                          onChange={(e) => {
                            const newChoices = [...questionData.choices];
                            newChoices[index] = e.target.value;
                            setQuestionData({ ...questionData, choices: newChoices });
                          }}
                          placeholder={`الخيار ${index + 1}`}
                          className="flex-1 px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f] bg-white text-stone-800"
                        />
                        {questionData.choices.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newChoices = questionData.choices.filter((_, i) => i !== index);
                              const newCorrectIndex = questionData.correctIndex === index ? 0 : 
                                questionData.correctIndex > index ? questionData.correctIndex - 1 : questionData.correctIndex;
                              setQuestionData({ ...questionData, choices: newChoices, correctIndex: newCorrectIndex });
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <TrashIcon size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setQuestionData({ ...questionData, choices: [...questionData.choices, ''] })}
                      className="px-3 py-1 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition"
                    >
                      + إضافة خيار
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-stone-700">شرح الإجابة (اختياري)</label>
                    <textarea
                      value={questionData.explanation}
                      onChange={(e) => setQuestionData({ ...questionData, explanation: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f] bg-white text-stone-800"
                      placeholder="شرح للإجابة الصحيحة..."
                    />
                  </div>
                </>
              )}

              {(questionData.type === 'TEXT' || questionData.type === 'ESSAY') && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 flex items-center gap-2">
                    <AlertIcon size={16} className="text-amber-600" />
                    {questionData.type === 'TEXT' ? 'سؤال نصي قصير' : 'سؤال مقالي'} - يحتاج تصحيح يدوي
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2 text-stone-700">صور السؤال (اختياري)</label>
                {questionData.images.map((img, idx) => (
                  <div key={idx} className="mb-2 flex items-start gap-2">
                    <span className="mt-3 text-xs text-stone-400 w-5 text-center">{idx + 1}</span>
                    <div className="flex-1">
                      <input
                        type="url"
                        value={img.imageUrl}
                        onChange={(e) => {
                          const newImages = [...questionData.images];
                          newImages[idx] = { ...newImages[idx], imageUrl: e.target.value };
                          setQuestionData({ ...questionData, images: newImages });
                        }}
                        className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f] bg-white text-stone-800 text-sm"
                        placeholder="https://drive.google.com/..."
                        dir="ltr"
                      />
                      {img.imageUrl && (
                        <div className="mt-1 p-1 bg-stone-50 rounded border border-stone-200 inline-block">
                          <Image src={toDirectImageUrl(img.imageUrl) || img.imageUrl} alt={`صورة ${idx + 1}`} width={200} height={120} className="max-h-24 rounded object-contain w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} onLoad={(e) => { (e.target as HTMLImageElement).style.display = 'block'; }} />
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => { const newImages = questionData.images.filter((_, i) => i !== idx).map((img, i) => ({ ...img, order: i })); setQuestionData({ ...questionData, images: newImages }); }} className="mt-2 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"><TrashIcon size={14} /></button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setQuestionData({ ...questionData, images: [...questionData.images, { imageUrl: '', order: questionData.images.length }] })}
                  className="px-3 py-1 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition"
                >
                  + إضافة صورة
                </button>
                <p className="text-xs text-stone-500 mt-1">الصق رابط صورة مباشر أو رابط Google Drive (تأكد أن الملف مشارك للعامة)</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-stone-700">النقاط</label>
                  <input
                    type="number"
                    value={questionData.points}
                    onChange={(e) => setQuestionData({ ...questionData, points: parseFloat(e.target.value) })}
                    min="0.5"
                    step="0.5"
                    required
                    className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f] bg-white text-stone-800"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={questionData.allowBonus}
                      onChange={(e) => setQuestionData({ ...questionData, allowBonus: e.target.checked })}
                      className="w-4 h-4 text-[#1a3a2f] cursor-pointer rounded"
                    />
                    <span className="text-sm text-stone-700">سؤال إضافي (bonus)</span>
                  </label>
                </div>
              </div>

              <div className={`p-3 rounded-lg ${
                totalPoints + questionData.points > exam.maxScore 
                  ? 'bg-amber-50 border border-amber-200' 
                  : 'bg-emerald-50 border border-emerald-200'
              }`}>
                <p className={`text-sm ${
                  totalPoints + questionData.points > exam.maxScore ? 'text-amber-800' : 'text-emerald-800'
                }`}>
                  المجموع بعد الإضافة: {totalPoints + questionData.points} / {exam.maxScore}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#1a3a2f] text-white rounded-lg hover:bg-[#2d5a4a] transition"
                >
                  إضافة السؤال
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuestionForm(false)}
                  className="px-6 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          {exam.questions.length === 0 ? (
            <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
              <p className="text-stone-500">لا توجد أسئلة بعد</p>
              <button
                onClick={() => setShowQuestionForm(true)}
                className="mt-4 px-4 py-2 bg-[#1a3a2f] text-white rounded-lg hover:bg-[#2d5a4a] transition text-sm"
              >
                إضافة سؤال جديد
              </button>
            </div>
          ) : (
            exam.questions.map((question, index) => (
              <div key={question.id} className={`bg-white rounded-xl border ${editingQuestionId === question.id ? 'border-[#1a3a2f]/30 ring-1 ring-[#1a3a2f]/10' : 'border-stone-200'} p-5`}>
                {editingQuestionId === question.id ? (
                  /* ---- Edit Question Mode ---- */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 bg-[#1a3a2f] text-white rounded-lg flex items-center justify-center font-bold text-sm">{index + 1}</span>
                        <h4 className="text-sm font-bold text-stone-800">تعديل السؤال</h4>
                      </div>
                      <button onClick={() => setEditingQuestionId(null)} className="p-1.5 text-stone-400 hover:text-stone-600 transition"><CloseIcon size={18} /></button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 text-stone-700">نص السؤال</label>
                      <textarea
                        value={editQuestionData.prompt}
                        onChange={(e) => setEditQuestionData({ ...editQuestionData, prompt: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f] bg-white text-stone-800 text-sm"
                      />
                    </div>

                    {editQuestionData.type === 'MULTIPLE_CHOICE' && (
                      <div>
                        <label className="block text-sm font-medium mb-1 text-stone-700">الخيارات</label>
                        {editQuestionData.choices.map((choice, ci) => (
                          <div key={ci} className="mb-2 flex items-center gap-2">
                            <input
                              type="radio"
                              name={`edit-correct-${question.id}`}
                              checked={editQuestionData.correctIndex === ci}
                              onChange={() => setEditQuestionData({ ...editQuestionData, correctIndex: ci })}
                              className="w-4 h-4 text-[#1a3a2f] cursor-pointer"
                            />
                            <input
                              type="text"
                              value={choice}
                              onChange={(e) => {
                                const newChoices = [...editQuestionData.choices];
                                newChoices[ci] = e.target.value;
                                setEditQuestionData({ ...editQuestionData, choices: newChoices });
                              }}
                              placeholder={`الخيار ${ci + 1}`}
                              className="flex-1 px-3 py-1.5 border border-stone-200 rounded-lg bg-white text-stone-800 text-sm"
                            />
                            {editQuestionData.choices.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newChoices = editQuestionData.choices.filter((_, i) => i !== ci);
                                  const newCI = editQuestionData.correctIndex === ci ? 0 : editQuestionData.correctIndex > ci ? editQuestionData.correctIndex - 1 : editQuestionData.correctIndex;
                                  setEditQuestionData({ ...editQuestionData, choices: newChoices, correctIndex: newCI });
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                              ><TrashIcon size={14} /></button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setEditQuestionData({ ...editQuestionData, choices: [...editQuestionData.choices, ''] })}
                          className="px-2 py-1 text-xs text-stone-600 hover:bg-stone-100 rounded transition"
                        >+ إضافة خيار</button>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-1 text-stone-700">شرح الإجابة (اختياري)</label>
                      <textarea
                        value={editQuestionData.explanation}
                        onChange={(e) => setEditQuestionData({ ...editQuestionData, explanation: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white text-stone-800 text-sm"
                        placeholder="شرح للإجابة الصحيحة..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 text-stone-700">صور السؤال (اختياري)</label>
                      {editQuestionData.images.map((img, idx) => (
                        <div key={idx} className="mb-2 flex items-start gap-2">
                          <span className="mt-2 text-xs text-stone-400 w-4 text-center">{idx + 1}</span>
                          <div className="flex-1">
                            <input
                              type="url"
                              value={img.imageUrl}
                              onChange={(e) => {
                                const newImages = [...editQuestionData.images];
                                newImages[idx] = { ...newImages[idx], imageUrl: e.target.value };
                                setEditQuestionData({ ...editQuestionData, images: newImages });
                              }}
                              className="w-full px-3 py-1.5 border border-stone-200 rounded-lg bg-white text-stone-800 text-sm"
                              placeholder="https://drive.google.com/..."
                              dir="ltr"
                            />
                            {img.imageUrl && (
                              <div className="mt-1 p-1 bg-stone-50 rounded border border-stone-200 inline-block">
                                <Image src={toDirectImageUrl(img.imageUrl) || img.imageUrl} alt={`صورة ${idx + 1}`} width={200} height={100} className="max-h-20 rounded object-contain w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} onLoad={(e) => { (e.target as HTMLImageElement).style.display = 'block'; }} />
                              </div>
                            )}
                          </div>
                          <button type="button" onClick={() => { const newImages = editQuestionData.images.filter((_, i) => i !== idx).map((img, i) => ({ ...img, order: i })); setEditQuestionData({ ...editQuestionData, images: newImages }); }} className="mt-1.5 p-1 text-red-500 hover:bg-red-50 rounded transition"><TrashIcon size={12} /></button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setEditQuestionData({ ...editQuestionData, images: [...editQuestionData.images, { imageUrl: '', order: editQuestionData.images.length }] })}
                        className="px-2 py-1 text-xs text-stone-600 hover:bg-stone-100 rounded transition"
                      >+ إضافة صورة</button>
                    </div>

                    <div className="flex items-center gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-stone-700">النقاط</label>
                        <input
                          type="number"
                          value={editQuestionData.points}
                          onChange={(e) => setEditQuestionData({ ...editQuestionData, points: parseFloat(e.target.value) || 0 })}
                          min="0.5"
                          step="0.5"
                          className="w-24 px-3 py-2 border border-stone-200 rounded-lg bg-white text-stone-800 text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-stone-100">
                      <button
                        onClick={() => handleSaveQuestion(question.id)}
                        disabled={savingQuestion}
                        className="px-4 py-2 bg-[#1a3a2f] text-white rounded-lg hover:bg-[#2d5a4a] transition text-sm disabled:opacity-50"
                      >
                        {savingQuestion ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                      </button>
                      <button
                        onClick={() => setEditingQuestionId(null)}
                        className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition text-sm"
                      >إلغاء</button>
                    </div>
                  </div>
                ) : (
                  /* ---- View Question Mode ---- */
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={exam.questions.length}
                            value={moveTargets[question.id] ?? index + 1}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) {
                                setMoveTargets(prev => ({ ...prev, [question.id]: val }));
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && moveTargets[question.id] && moveTargets[question.id] !== index + 1) {
                                handleMoveQuestion(question.id);
                              }
                            }}
                            className="w-9 h-8 bg-[#1a3a2f] text-white rounded-lg text-center font-bold text-sm border-2 border-dashed border-white/30 hover:bg-[#2d5a4a] hover:border-white/60 focus:border-white/70 focus:bg-[#2d5a4a] focus:outline-none cursor-pointer transition-colors appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            title="غيّر الرقم لنقل السؤال"
                          />
                          <span className="text-[9px] text-stone-400 leading-none">ترتيب</span>
                          {moveTargets[question.id] !== undefined && moveTargets[question.id] !== index + 1 && (
                            <button
                              onClick={() => handleMoveQuestion(question.id)}
                              disabled={movingQuestionId === question.id}
                              className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-[10px] font-medium hover:bg-amber-600 transition disabled:opacity-50 whitespace-nowrap"
                            >
                              {movingQuestionId === question.id ? '...' : 'نقل'}
                            </button>
                          )}
                        </div>
                        <div>
                          <p className="text-stone-800 font-medium">{question.prompt}</p>
                          {question.images && question.images.length > 0 && (
                            <ImageLightbox images={question.images} maxHeight="max-h-48" />
                          )}
                          {question.type && question.type !== 'MULTIPLE_CHOICE' && (
                            <span className="text-xs text-amber-600 mt-1 inline-block">
                              {question.type === 'TEXT' ? 'نصي قصير' : 'مقالي'} - تصحيح يدوي
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-stone-100 text-stone-700 rounded text-sm">
                          {question.points} نقطة
                        </span>
                        <button
                          onClick={() => openEditQuestion(question)}
                          className="px-3 py-1.5 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-lg transition text-sm font-medium flex items-center gap-1"
                        >
                          <EditIcon size={14} /> تعديل
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition text-sm font-medium"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                    
                    {(question.type === 'MULTIPLE_CHOICE' || !question.type) && question.choices && (
                      <div className="space-y-2 mr-11">
                        {question.choices.map((choice, choiceIndex) => (
                          <div
                            key={choiceIndex}
                            className={`p-3 rounded-lg border ${
                              choiceIndex === question.correctIndex
                                ? 'bg-emerald-50 border-emerald-300'
                                : 'bg-stone-50 border-stone-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-stone-600">
                                {String.fromCharCode(1570 + choiceIndex)}.
                              </span>
                              <span className="text-sm text-stone-800">{choice}</span>
                              {choiceIndex === question.correctIndex && (
                                <span className="px-2 py-0.5 bg-emerald-500 text-white rounded text-xs flex items-center gap-1">
                                  <CheckCircleIcon size={12} /> صحيح
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {question.explanation && (
                          <div className="mt-3 p-3 bg-stone-50 border border-stone-200 rounded-lg">
                            <p className="text-xs font-medium text-stone-600 mb-1">شرح الإجابة:</p>
                            <p className="text-sm text-stone-700">{question.explanation}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {(question.type === 'TEXT' || question.type === 'ESSAY') && (
                      <div className="mr-11 p-3 bg-stone-50 rounded-lg border border-stone-200">
                        <p className="text-sm text-stone-600">
                          {question.type === 'TEXT' ? 'إجابة نصية قصيرة' : 'إجابة مقالية'} - يحتاج تصحيح يدوي
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={handleConfirmClose}
        onConfirm={handleConfirm}
        {...confirmOptions}
      />
    </div>
  );
}
