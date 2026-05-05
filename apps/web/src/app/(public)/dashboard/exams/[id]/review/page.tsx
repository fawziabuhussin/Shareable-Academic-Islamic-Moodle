'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { AlertIcon, CheckCircleIcon, ClockIcon, ExamIcon } from '@/components/Icons';
import { toDirectImageUrl } from '@/lib/utils';
import ImageLightbox from '@/components/ImageLightbox';
import PageLoading from '@/components/PageLoading';

interface Question {
  id: string;
  prompt: string;
  type: 'MULTIPLE_CHOICE' | 'TEXT' | 'ESSAY';
  choices?: string[];
  correctIndex?: number;
  explanation?: string;
  images?: { id: string; imageUrl: string; order: number }[];
  points: number;
  order: number;
}

interface Attempt {
  id: string;
  userId: string;
  answers: string;
  score: number | null;
  status: string;
  submittedAt: string;
  attemptNumber?: number;
  isRetake?: boolean;
}

interface Exam {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  startDate: string;
  endDate: string;
  maxScore: number;
  passingScore: number;
  retakeScorePercent?: number;
  questions: Question[];
  attempts?: Attempt[];
  course?: { id: string; title: string };
}

export default function ExamReviewPage() {
  const params = useParams();
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExamReview();
  }, [params.id]);

  const loadExamReview = async () => {
    try {
      const response = await api.get(`/exams/${params.id}`);
      const examData = response.data;

      // Parse questions choices if needed
      const parsedQuestions = (examData.questions || []).map((q: any) => {
        let choices = q.choices;
        if (typeof choices === 'string') {
          try {
            choices = JSON.parse(choices);
          } catch {
            choices = [];
          }
        }
        return { ...q, choices: choices || [] };
      });

      examData.questions = parsedQuestions;

      // Check if review is available
      const now = new Date();
      const endDate = new Date(examData.endDate);
      const studentAttempt = examData.attempts?.[0];

      if (now <= endDate) {
        setError('مراجعة الإجابات متاحة فقط بعد انتهاء الامتحان');
        setLoading(false);
        return;
      }

      if (!studentAttempt) {
        setError('لم تقم بإجراء هذا الامتحان');
        setLoading(false);
        return;
      }

      // For retake attempts, check effective score (after penalty) against passing score
      const retakeMultiplier = (examData.retakeScorePercent ?? 75) / 100;
      const rawScore = studentAttempt.score;
      const effectiveScore = rawScore !== null && studentAttempt.isRetake
        ? rawScore * retakeMultiplier
        : rawScore;
      if (effectiveScore === null || effectiveScore < examData.passingScore) {
        setError('مراجعة الإجابات متاحة فقط للناجحين في الامتحان');
        setLoading(false);
        return;
      }

      // Check if answers are actually included (backend should include them for passed students)
      const hasAnswers = examData.questions?.some(
        (q: Question) => q.correctIndex !== undefined || q.explanation
      );

      if (!hasAnswers) {
        setError('الإجابات غير متاحة حالياً');
        setLoading(false);
        return;
      }

      // Parse user answers
      let parsedAnswers: Record<string, any> = {};
      if (studentAttempt.answers) {
        try {
          parsedAnswers =
            typeof studentAttempt.answers === 'string'
              ? JSON.parse(studentAttempt.answers)
              : studentAttempt.answers;
        } catch {
          parsedAnswers = {};
        }
      }

      setExam(examData);
      setAttempt(studentAttempt);
      setUserAnswers(parsedAnswers);
    } catch (err: any) {
      console.error('Failed to load exam review:', err);
      setError(err.response?.data?.message || 'حدث خطأ أثناء تحميل المراجعة');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLoading 
        title="جاري تحميل المراجعة..." 
        icon={<ExamIcon className="text-white" size={20} />}
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center max-w-md">
          <AlertIcon className="mx-auto mb-4 text-amber-500" size={48} />
          <p className="text-lg text-stone-800 mb-2">{error}</p>
          <button
            onClick={() => router.push('/dashboard/exams')}
            className="mt-4 px-6 py-2 bg-[#1a3a2f] text-white rounded-lg hover:bg-[#2d5a4a] transition"
          >
            العودة إلى الامتحانات
          </button>
        </div>
      </div>
    );
  }

  if (!exam || !attempt) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center max-w-md">
          <p className="text-lg text-stone-600 mb-4">الامتحان غير موجود</p>
          <button
            onClick={() => router.push('/dashboard/exams')}
            className="px-6 py-2 bg-[#1a3a2f] text-white rounded-lg hover:bg-[#2d5a4a] transition"
          >
            العودة إلى الامتحانات
          </button>
        </div>
      </div>
    );
  }

  const isRetakeAttempt = attempt.isRetake === true;
  const retakeMultiplier = (exam.retakeScorePercent ?? 75) / 100;
  const rawScore = attempt.score;
  const effectiveScore = rawScore !== null && isRetakeAttempt
    ? Math.round(rawScore * retakeMultiplier * 100) / 100
    : rawScore;
  const displayScore = effectiveScore ?? rawScore;
  const passed = displayScore !== null && displayScore >= exam.passingScore;
  const percentage = displayScore !== null ? Math.round((displayScore / exam.maxScore) * 100) : 0;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/dashboard/exams"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4 text-sm transition"
          >
            ← العودة إلى الامتحانات
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <ExamIcon className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold">مراجعة: {exam.title}</h1>
              <p className="text-white/70 text-sm">{exam.course?.title}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Retake indicator */}
        {isRetakeAttempt && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 text-sm text-orange-800">
            هذه مراجعة لمحاولة الإعادة. درجتك محسوبة بنسبة {exam.retakeScorePercent ?? 75}% من درجة الامتحان
          </div>
        )}

        {/* Score Summary */}
        <div
          className={`rounded-xl border p-6 mb-6 ${
            passed
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  passed ? 'bg-emerald-100' : 'bg-red-100'
                }`}
              >
                <CheckCircleIcon
                  className={passed ? 'text-emerald-600' : 'text-red-600'}
                  size={24}
                />
              </div>
              <div>
                <h2
                  className={`text-lg font-bold ${
                    passed ? 'text-emerald-800' : 'text-red-800'
                  }`}
                >
                  {passed ? 'ناجح' : 'راسب'}
                </h2>
                {isRetakeAttempt && rawScore !== null ? (
                  <>
                    <p className="text-stone-600 text-sm">
                      درجة الامتحان: {rawScore} من {exam.maxScore}
                    </p>
                    <p className={`font-bold ${passed ? 'text-emerald-600' : 'text-red-600'}`}>
                      درجتك ({exam.retakeScorePercent ?? 75}%): {effectiveScore} من {exam.maxScore} ({percentage}%)
                    </p>
                  </>
                ) : (
                  <p className={passed ? 'text-emerald-600' : 'text-red-600'}>
                    {percentage}% - {attempt.score} من {exam.maxScore}
                  </p>
                )}
              </div>
            </div>
            <div className="text-left">
              <p className="text-sm text-stone-500">درجة النجاح</p>
              <p className="font-bold text-stone-800">{exam.passingScore}</p>
            </div>
          </div>
        </div>

        {/* Questions Review */}
        <div className="space-y-4">
          {exam.questions.map((question, index) => {
            const userAnswer = userAnswers[question.id];
            const isCorrect =
              question.type === 'MULTIPLE_CHOICE' &&
              userAnswer !== undefined &&
              userAnswer === question.correctIndex;
            const isWrong =
              question.type === 'MULTIPLE_CHOICE' &&
              userAnswer !== undefined &&
              userAnswer !== null &&
              userAnswer !== question.correctIndex;

            return (
              <div
                key={question.id}
                className={`bg-white rounded-xl border p-5 ${
                  isCorrect
                    ? 'border-emerald-200'
                    : isWrong
                    ? 'border-red-200'
                    : 'border-stone-200'
                }`}
              >
                {/* Question Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-700'
                          : isWrong
                          ? 'bg-red-100 text-red-700'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-stone-800 font-medium whitespace-pre-wrap">
                        {question.prompt}
                      </p>
                      {question.images && question.images.length > 0 && (
                        <ImageLightbox images={question.images} maxHeight="max-h-56" thumbWidth={500} thumbHeight={350} />
                      )}
                      <p className="text-xs text-stone-500 mt-1">{question.points} نقطة</p>
                    </div>
                  </div>
                  {question.type === 'MULTIPLE_CHOICE' && (
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-700'
                          : isWrong
                          ? 'bg-red-100 text-red-700'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {isCorrect ? 'صحيح' : isWrong ? 'خطأ' : 'لم يُجب'}
                    </span>
                  )}
                </div>

                {/* Multiple Choice Options */}
                {question.type === 'MULTIPLE_CHOICE' && question.choices && (
                  <div className="space-y-2 mr-11">
                    {question.choices.map((choice: string, choiceIndex: number) => {
                      const isUserAnswer = userAnswer === choiceIndex;
                      const isCorrectAnswer = question.correctIndex === choiceIndex;

                      let bgClass = 'bg-stone-50 border-stone-200';
                      let textClass = 'text-stone-700';

                      if (isCorrectAnswer) {
                        bgClass = 'bg-emerald-50 border-emerald-300';
                        textClass = 'text-emerald-800';
                      } else if (isUserAnswer && !isCorrectAnswer) {
                        bgClass = 'bg-red-50 border-red-300';
                        textClass = 'text-red-800';
                      }

                      return (
                        <div
                          key={choiceIndex}
                          className={`flex items-center p-3 border rounded-lg ${bgClass}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className={`font-medium ${textClass}`}>{choice}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isCorrectAnswer && (
                              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                                الإجابة الصحيحة
                              </span>
                            )}
                            {isUserAnswer && !isCorrectAnswer && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                إجابتك
                              </span>
                            )}
                            {isUserAnswer && isCorrectAnswer && (
                              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                                إجابتك ✓
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Text/Essay Answers */}
                {(question.type === 'TEXT' || question.type === 'ESSAY') && (
                  <div className="mr-11 space-y-3">
                    <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg">
                      <p className="text-xs text-stone-500 mb-1">إجابتك:</p>
                      <p className="text-stone-800 whitespace-pre-wrap">
                        {userAnswer || '(لم يُجب)'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Explanation */}
                {question.explanation && (
                  <div className="mr-11 mt-4 p-4 bg-sky-50 border border-sky-200 rounded-lg">
                    <p className="text-xs text-sky-600 font-medium mb-1">الشرح:</p>
                    <p className="text-sky-800 whitespace-pre-wrap">{question.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Back Button */}
        <div className="mt-6">
          <Link
            href="/dashboard/exams"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a3a2f] text-white rounded-xl font-bold hover:bg-[#143026] transition"
          >
            العودة إلى الامتحانات
          </Link>
        </div>
      </div>
    </div>
  );
}
