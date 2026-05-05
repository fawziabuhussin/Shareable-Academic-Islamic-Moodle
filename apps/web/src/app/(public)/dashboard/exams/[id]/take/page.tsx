'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';
import { AlertIcon, BookIcon, ClockIcon, CheckCircleIcon, ExamIcon } from '@/components/Icons';
import { showSuccess, showError, showWarning, TOAST_MESSAGES } from '@/lib/toast';
import { formatDateTime, toDirectImageUrl } from '@/lib/utils';
import ImageLightbox from '@/components/ImageLightbox';
import PageLoading from '@/components/PageLoading';

interface Question {
  id: string;
  prompt: string;
  type: 'MULTIPLE_CHOICE' | 'TEXT' | 'ESSAY';
  choices?: string[];
  correctIndex?: number;
  images?: { id: string; imageUrl: string; order: number }[];
  points: number;
  order: number;
}

interface RetakeInfo {
  canRetake: boolean;
  previousAttemptFailed: boolean;
  previousScore: number | null;
  maxEffectiveScore: number;
  attemptNumber: number;
  retakeScorePercent?: number;
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
  questions: Question[];
  course?: { id: string; title: string };
  courseCompletionRequired?: boolean;
  allLessonsCompleted?: boolean;
  completedLessons?: number;
  totalLessons?: number;
  attempts?: Array<{ id: string; score: number | null; attemptNumber?: number; isRetake?: boolean; status?: string }>;
  retakeInfo?: RetakeInfo;
}

export default function TakeExamPage() {
  const params = useParams();
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [warningPlayed, setWarningPlayed] = useState(false);
  const [pledgeAccepted, setPledgeAccepted] = useState(false);
  const [pledgeChecked, setPledgeChecked] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [isRetake, setIsRetake] = useState(false);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const examSubmittedRef = useRef(false);
  const answersRef = useRef<Record<string, any>>({});
  const examRef = useRef<Exam | null>(null);
  const pendingNavigationRef = useRef<string | null>(null);
  const pendingClickTargetRef = useRef<HTMLElement | null>(null);
  const examContainerRef = useRef<HTMLDivElement>(null);

  // Keep refs in sync with state for event handlers
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { examRef.current = exam; }, [exam]);

  useEffect(() => {
    loadExam();
  }, [params.id]);

  useEffect(() => {
    if (exam && startTime) {
      const interval = setInterval(() => {
        const elapsedSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
        const totalSeconds = exam.durationMinutes * 60;
        const remainingSeconds = totalSeconds - elapsedSeconds;

        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;

        setTimeRemaining(Math.max(0, mins));
        setSecondsRemaining(Math.max(0, secs));

        // Play warning sound at 5 minutes remaining
        if (remainingSeconds <= 300 && remainingSeconds > 295 && !warningPlayed) {
          playWarningSound();
          setWarningPlayed(true);
        }

        // Auto-submit when time runs out
        if (remainingSeconds <= 0) {
          clearInterval(interval);
          handleAutoSubmit();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [exam, startTime, warningPlayed]);

  // Navigation guard: beforeunload + popstate + pagehide + link click interception
  useEffect(() => {
    if (!pledgeAccepted || examSubmittedRef.current) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (examSubmittedRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };

    const handlePopState = () => {
      if (examSubmittedRef.current) return;
      // Re-push state to prevent actual navigation
      window.history.pushState({ examGuard: true }, '');
      setShowExitWarning(true);
    };

    // Intercept clicks on links and buttons outside the exam container
    const handleClickIntercept = (e: MouseEvent) => {
      if (examSubmittedRef.current) return;
      const target = e.target as HTMLElement;

      // Allow clicks inside the exam container (questions, submit, modals, etc.)
      if (examContainerRef.current?.contains(target)) return;

      // Check for <a> tags (navbar links)
      const anchor = target.closest('a');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (!href || href.startsWith('#')) return;
        const currentPath = window.location.pathname;
        if (href === currentPath) return;

        e.preventDefault();
        e.stopPropagation();
        pendingNavigationRef.current = href;
        pendingClickTargetRef.current = null;
        setShowExitWarning(true);
        return;
      }

      // Check for <button> tags outside exam (logout, etc.)
      const button = target.closest('button');
      if (button) {
        e.preventDefault();
        e.stopPropagation();
        pendingNavigationRef.current = null;
        pendingClickTargetRef.current = button;
        setShowExitWarning(true);
      }
    };

    const handlePageHide = () => {
      if (examSubmittedRef.current) return;
      // Best-effort submit on page hide (tab close, navigation away)
      const currentExam = examRef.current;
      const currentAnswers = answersRef.current;
      if (!currentExam) return;

      const answersObj: Record<string, any> = {};
      currentExam.questions.forEach(q => {
        if (q.type === 'MULTIPLE_CHOICE') {
          if (currentAnswers[q.id] !== null && currentAnswers[q.id] !== undefined) {
            answersObj[q.id] = currentAnswers[q.id];
          }
        } else {
          if (currentAnswers[q.id] && currentAnswers[q.id].trim() !== '') {
            answersObj[q.id] = currentAnswers[q.id];
          }
        }
      });

      const token = localStorage.getItem('accessToken');
      const baseUrl = api.defaults.baseURL;
      try {
        fetch(`${baseUrl}/exams/${params.id}/attempt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ answers: answersObj }),
          keepalive: true,
        });
      } catch (e) {
        // Best effort - can't do much if it fails during page hide
      }
    };

    // Push initial history state for back-button interception
    window.history.pushState({ examGuard: true }, '');

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('click', handleClickIntercept, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('click', handleClickIntercept, true);
    };
  }, [pledgeAccepted, params.id]);

  // Build answers object for submission
  const buildAnswersObj = useCallback(() => {
    const currentExam = examRef.current;
    const currentAnswers = answersRef.current;
    if (!currentExam) return {};

    const answersObj: Record<string, any> = {};
    currentExam.questions.forEach(q => {
      if (q.type === 'MULTIPLE_CHOICE') {
        if (currentAnswers[q.id] !== null && currentAnswers[q.id] !== undefined) {
          answersObj[q.id] = currentAnswers[q.id];
        }
      } else {
        if (currentAnswers[q.id] && currentAnswers[q.id].trim() !== '') {
          answersObj[q.id] = currentAnswers[q.id];
        }
      }
    });
    return answersObj;
  }, []);

  // Play warning sound
  const playWarningSound = () => {
    try {
      // Create an audio context for the warning beep
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();

      // Beep pattern: 3 short beeps
      setTimeout(() => { gainNode.gain.value = 0; }, 200);
      setTimeout(() => { gainNode.gain.value = 0.3; }, 400);
      setTimeout(() => { gainNode.gain.value = 0; }, 600);
      setTimeout(() => { gainNode.gain.value = 0.3; }, 800);
      setTimeout(() => { gainNode.gain.value = 0; oscillator.stop(); }, 1000);
    } catch (e) {
      console.log('Audio warning not supported');
    }
  };

  // Auto-submit when time runs out
  const handleAutoSubmit = async () => {
    if (submitting || examSubmittedRef.current) return;
    examSubmittedRef.current = true;
    setSubmitting(true);
    showWarning('انتهى الوقت! جاري تسليم الامتحان تلقائياً...');
    try {
      await api.post(`/exams/${params.id}/attempt`, { answers: buildAnswersObj() });
      showSuccess(TOAST_MESSAGES.EXAM_SUBMIT_SUCCESS);
      router.push('/dashboard/exams');
    } catch (error: any) {
      console.error('Auto-submit failed:', error);
      showError(TOAST_MESSAGES.EXAM_SUBMIT_ERROR);
      examSubmittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  // Handle exit confirmation (user chose to leave)
  const handleExitConfirm = async () => {
    if (submitting || examSubmittedRef.current) return;
    examSubmittedRef.current = true;
    setShowExitWarning(false);
    setSubmitting(true);
    showWarning('جاري تسليم الامتحان...');
    const destination = pendingNavigationRef.current;
    const clickTarget = pendingClickTargetRef.current;
    pendingNavigationRef.current = null;
    pendingClickTargetRef.current = null;
    try {
      await api.post(`/exams/${params.id}/attempt`, { answers: buildAnswersObj() });
      showSuccess(TOAST_MESSAGES.EXAM_SUBMIT_SUCCESS);
      // Replay the original action: link navigation or button click (e.g. logout)
      if (destination) {
        router.push(destination);
      } else if (clickTarget) {
        // examSubmittedRef is true so our intercept handler will skip this click
        clickTarget.click();
      } else {
        router.push('/dashboard/exams');
      }
    } catch (error: any) {
      console.error('Exit submit failed:', error);
      showError('فشل تسليم الامتحان. لا تزال إجاباتك محفوظة، حاول مرة أخرى.');
      examSubmittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  // Scroll to question
  const scrollToQuestion = (questionId: string) => {
    questionRefs.current[questionId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const loadExam = async () => {
    try {
      const response = await api.get(`/exams/${params.id}`);

      const examData = {
        ...response.data,
        questions: (response.data.questions || []).map((q: any) => {
          let choices = q.choices;
          if (typeof choices === 'string') {
            try {
              choices = JSON.parse(choices);
            } catch (e) {
              choices = [];
            }
          }
          return {
            ...q,
            type: q.type || 'MULTIPLE_CHOICE',
            choices: choices || [],
          };
        }),
      };

      // Check if user already has an attempt
      if (examData.attempts && examData.attempts.length > 0) {
        // Check if retake is allowed (failed student can retake)
        if (examData.retakeInfo?.canRetake) {
          // Allow retake -- show pledge screen with retake notice
          setIsRetake(true);
          setExam(examData);
        } else {
          // Already completed or can't retake -- redirect away
          if (!examSubmittedRef.current) {
            examSubmittedRef.current = true;
            showWarning('تم تسليم الامتحان.');
            router.push('/dashboard/exams');
          }
          return;
        }
      } else {
        setExam(examData);
      }
      setTimeRemaining(examData.durationMinutes);

      const initialAnswers: Record<string, any> = {};
      examData.questions.forEach((q: Question) => {
        if (q.type === 'MULTIPLE_CHOICE') {
          initialAnswers[q.id] = null;
        } else {
          initialAnswers[q.id] = '';
        }
      });
      setAnswers(initialAnswers);
    } catch (error: any) {
      console.error('Failed to load exam:', error);
      if (error.response?.status === 404) {
        router.push('/dashboard/exams');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle pledge acceptance - starts the timer
  const handlePledgeAccept = () => {
    setPledgeAccepted(true);
    setStartTime(new Date());
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  // Get unanswered questions count
  const getUnansweredCount = () => {
    if (!exam) return 0;
    return exam.questions.filter(q => {
      if (q.type === 'MULTIPLE_CHOICE') {
        return answers[q.id] === null || answers[q.id] === undefined;
      } else {
        return !answers[q.id] || answers[q.id].trim() === '';
      }
    }).length;
  };

  // Show confirmation modal
  const handleSubmitClick = () => {
    setShowConfirmModal(true);
  };

  // Confirm and submit
  const handleConfirmSubmit = async () => {
    if (submitting || examSubmittedRef.current) return;
    examSubmittedRef.current = true;
    setShowConfirmModal(false);
    setSubmitting(true);

    try {
      await api.post(`/exams/${params.id}/attempt`, {
        answers: buildAnswersObj(),
      });

      showSuccess(TOAST_MESSAGES.EXAM_SUBMIT_SUCCESS);
      router.push('/dashboard/exams');
    } catch (error: any) {
      console.error('Failed to submit exam:', error);
      examSubmittedRef.current = false;
      const errorMessage = error.response?.data?.message || TOAST_MESSAGES.EXAM_SUBMIT_ERROR;
      if (error.response?.data?.completedLessons !== undefined) {
        showError(`${errorMessage} - الدروس المكتملة: ${error.response.data.completedLessons} من ${error.response.data.totalLessons}`);
      } else {
        showError(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageLoading
        title="جاري تحميل الامتحان..."
        icon={<ExamIcon className="text-white" size={20} />}
      />
    );
  }

  if (!exam) {
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

  const now = new Date();
  const start = new Date(exam.startDate);
  const end = new Date(exam.endDate);

  if (now < start) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center max-w-md">
          <ClockIcon className="mx-auto mb-4 text-amber-500" size={48} />
          <p className="text-lg text-stone-800 mb-2">الامتحان لم يبدأ بعد</p>
          <p className="text-stone-600 mb-6">
            سيبدأ في: <span dir="ltr">{formatDateTime(start)}</span>
          </p>
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

  if (now > end) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center max-w-md">
          <AlertIcon className="mx-auto mb-4 text-red-500" size={48} />
          <p className="text-lg text-stone-800 mb-2">الامتحان انتهى</p>
          <p className="text-stone-600 mb-6">
            انتهى في: <span dir="ltr">{formatDateTime(end)}</span>
          </p>
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

  if (exam.courseCompletionRequired && !exam.allLessonsCompleted) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-amber-200 p-8 max-w-lg">
          <div className="flex items-center gap-3 mb-4">
            <AlertIcon className="text-amber-600" size={28} />
            <h2 className="text-xl font-bold text-stone-800">يجب إكمال جميع دروس الدورة</h2>
          </div>
          <p className="text-stone-600 mb-4">
            لا يمكنك إجراء هذا الامتحان حتى تكمل جميع دروس الدورة
          </p>
          <div className="bg-stone-50 rounded-lg p-4 mb-6">
            <p className="text-stone-700 font-medium mb-2">
              الدروس المكتملة: {exam.completedLessons || 0} من {exam.totalLessons || 0}
            </p>
            <div className="w-full bg-stone-200 rounded-full h-3">
              <div
                className="bg-[#1a3a2f] h-3 rounded-full transition-all"
                style={{ width: `${exam.totalLessons ? (exam.completedLessons || 0) / exam.totalLessons * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          <button
            onClick={() => router.push(`/courses/${exam.course?.id || ''}`)}
            className="w-full px-6 py-3 bg-[#1a3a2f] text-white rounded-lg hover:bg-[#2d5a4a] transition"
          >
            العودة إلى الدورة
          </button>
        </div>
      </div>
    );
  }

  // Pledge screen - shown before exam starts
  if (!pledgeAccepted) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border-2 border-stone-200 shadow-lg max-w-lg w-full overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white px-6 py-5 text-center">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <ExamIcon className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-bold">{exam.title}</h1>
            <p className="text-white/70 text-sm mt-1">{exam.course?.title}</p>
          </div>

          {/* Pledge Content */}
          <div className="p-6">
            {/* Retake Notice */}
            {isRetake && exam.retakeInfo && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 mb-5">
                <p className="text-orange-800 font-bold text-sm mb-1">هذه إعادة للاختبار</p>
                <p className="text-orange-700 text-sm">
                  الدرجة السابقة: <span className="font-bold text-red-600">{exam.retakeInfo.previousScore} / {exam.maxScore}</span>
                </p>
                <p className="text-orange-700 text-sm mt-1">
                  العلامة النهائية في الإعادة تُحسب بنسبة <span className="font-bold">{exam.retakeInfo?.retakeScorePercent ?? 75}%</span> من درجة الامتحان
                </p>
              </div>
            )}

            <h2 className="text-lg font-bold text-[#1a3a2f] text-center mb-5">
              تعهّد قبل فتح الاختبار والموافقة عليه
            </h2>

            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 mb-6">
              <p className="text-stone-800 font-bold text-lg leading-relaxed mb-4">
                {'\u2713'} أقرّ وأتعهد أمام الله<span className="text-4xl inline-block ml-0.5">{'\uFDFB'}</span>
              </p>
              <div className="space-y-3 text-stone-700 leading-relaxed">
                <p>1- بألّا أتقدّم للاختبار إلا بعد إتمام دراسة المادة دراسةً كاملة واستيعاب محتواها</p>
                <p>2- ألا أستعين بشيء خارج عن محفوظي، وعدم الاحتفاظ بالأسئلة أو نشرها.</p>
              </div>
            </div>

            {/* Exam Info */}
            <div className="bg-stone-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">المدة:</span>
                  <span className="font-medium text-stone-800">{exam.durationMinutes} دقيقة</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">الأسئلة:</span>
                  <span className="font-medium text-stone-800">{exam.questions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">الدرجة الكاملة:</span>
                  <span className="font-medium text-stone-800">{exam.maxScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">درجة النجاح:</span>
                  <span className="font-medium text-stone-800">{exam.passingScore}</span>
                </div>
              </div>
            </div>

            {/* Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer mb-6 p-3 rounded-lg border-2 border-stone-200 hover:border-[#1a3a2f] transition">
              <input
                type="checkbox"
                checked={pledgeChecked}
                onChange={(e) => setPledgeChecked(e.target.checked)}
                className="w-5 h-5 mt-0.5 text-[#1a3a2f] rounded flex-shrink-0"
              />
              <span className="text-stone-700 font-medium">
                أوافق على التعهّد أعلاه وأؤكد التزامي بما جاء فيه
              </span>
            </label>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard/exams')}
                className="flex-1 px-4 py-3 border border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition"
              >
                العودة
              </button>
              <button
                onClick={handlePledgeAccept}
                disabled={!pledgeChecked}
                className="flex-1 px-4 py-3 bg-[#1a3a2f] text-white rounded-xl font-bold hover:bg-[#2d5a4a] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                بدء الاختبار
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (minutes: number, seconds: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${mins}:${seconds.toString().padStart(2, '0')}`;
  };

  // Check if question is answered
  const isQuestionAnswered = (questionId: string) => {
    const answer = answers[questionId];
    const question = exam?.questions.find(q => q.id === questionId);
    if (!question) return false;
    if (question.type === 'MULTIPLE_CHOICE') {
      return answer !== null && answer !== undefined;
    }
    return answer && answer.trim() !== '';
  };

  const answeredCount = Object.values(answers).filter(a => a !== null && a !== '' && a !== undefined).length;
  const unansweredCount = getUnansweredCount();
  const isLowTime = timeRemaining < 5;
  const isWarningTime = timeRemaining < 10 && timeRemaining >= 5;

  return (
    <div ref={examContainerRef} className="min-h-screen bg-stone-50">
      {/* Exit Warning Modal */}
      {showExitWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 bg-red-100">
                <AlertIcon size={32} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-stone-800 mb-2">
                تحذير: الخروج من الامتحان
              </h3>
              <p className="text-stone-600">
                الخروج من صفحة الامتحان سيؤدي إلى تسليم إجاباتك الحالية تلقائياً. هل تريد المتابعة؟
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExitWarning(false)}
                className="flex-1 px-4 py-3 bg-[#1a3a2f] text-white rounded-xl font-medium hover:bg-[#2d5a4a] transition"
              >
                البقاء في الامتحان
              </button>
              <button
                onClick={handleExitConfirm}
                disabled={submitting}
                className="flex-1 px-4 py-3 border-2 border-red-300 text-red-700 rounded-xl font-medium hover:bg-red-50 transition disabled:opacity-50"
              >
                {submitting ? 'جاري التسليم...' : 'الخروج وتسليم الامتحان'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                unansweredCount > 0 ? 'bg-amber-100' : 'bg-emerald-100'
              }`}>
                {unansweredCount > 0 ? (
                  <AlertIcon size={32} className="text-amber-600" />
                ) : (
                  <CheckCircleIcon size={32} className="text-emerald-600" />
                )}
              </div>
              <h3 className="text-xl font-bold text-stone-800 mb-2">
                {unansweredCount > 0 ? 'تأكيد التسليم' : 'هل أنت متأكد؟'}
              </h3>
              <p className="text-stone-600">
                {unansweredCount > 0
                  ? `لديك ${unansweredCount} سؤال غير مجاب. هل تريد التسليم على أي حال؟`
                  : 'أجبت على جميع الأسئلة. هل تريد تسليم الامتحان؟'}
              </p>
            </div>

            <div className="bg-stone-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-stone-600">الأسئلة المجاب عليها</span>
                <span className="font-bold text-emerald-600">{answeredCount}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-stone-600">الأسئلة المتبقية</span>
                <span className={`font-bold ${unansweredCount > 0 ? 'text-amber-600' : 'text-stone-400'}`}>
                  {unansweredCount}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">الوقت المتبقي</span>
                <span className={`font-bold ${isLowTime ? 'text-red-600' : 'text-stone-800'}`}>
                  {formatTime(timeRemaining, secondsRemaining)}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-3 border border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition"
              >
                مراجعة الإجابات
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-[#1a3a2f] text-white rounded-xl font-medium hover:bg-[#2d5a4a] transition disabled:opacity-50"
              >
                {submitting ? 'جاري التسليم...' : 'تأكيد التسليم'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Header - Timer, Progress, Navigation (Two Rows) */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-white border-b border-stone-200 shadow-md">
        {/* Row 1: Title, Progress, Timer */}
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Title & Progress */}
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-stone-800 truncate">{exam.title}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-stone-500">{answeredCount}/{exam.questions.length}</span>
                <div className="flex-1 max-w-32 bg-stone-100 rounded-full h-1.5">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(answeredCount / exam.questions.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Timer */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono ${
              isLowTime
                ? 'bg-red-100 text-red-700 animate-pulse'
                : isWarningTime
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
            }`}>
              <ClockIcon size={18} />
              <span className="text-xl font-bold tabular-nums">
                {formatTime(timeRemaining, secondsRemaining)}
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Question Navigation */}
        <div className="bg-stone-50 border-t border-stone-200 mt-1">
          <div className="max-w-5xl mx-auto px-4 py-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs text-stone-500 flex-shrink-0 ml-2">الأسئلة:</span>
              {exam.questions.map((q, index) => (
                <button
                  key={q.id}
                  onClick={() => scrollToQuestion(q.id)}
                  className={`w-8 h-8 rounded-lg font-medium text-sm transition-all flex-shrink-0 ${
                    isQuestionAnswered(q.id)
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                  }`}
                  title={`السؤال ${index + 1}${isQuestionAnswered(q.id) ? ' (تم الإجابة)' : ''}`}
                >
                  {index + 1}
                </button>
              ))}
              <div className="flex-shrink-0 mr-2">
                <button
                  onClick={handleSubmitClick}
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#1a3a2f] text-white rounded-lg font-medium hover:bg-[#2d5a4a] transition disabled:opacity-50 text-sm whitespace-nowrap"
                >
                  تسليم
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Low time warning bar */}
        {isLowTime && (
          <div className="bg-red-600 text-white text-center py-1 text-sm font-medium animate-pulse">
            الوقت ينفد! تبقى أقل من 5 دقائق
          </div>
        )}
      </div>

      {/* Spacer for fixed header (approx height of the two rows) */}
      <div className="h-32"></div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Exit warning notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm text-amber-800">
            <AlertIcon size={16} className="text-amber-600 flex-shrink-0" />
            <span>مغادرة صفحة الامتحان ستؤدي إلى تسليم إجاباتك الحالية تلقائياً.</span>
          </div>

          {/* Exam Info */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 mb-6">
            <div className="flex flex-wrap gap-4 text-sm text-stone-600">
              <span className="flex items-center gap-1">
                <span className="font-medium">الدرجة الكاملة:</span> {exam.maxScore}
              </span>
              <span className="flex items-center gap-1">
                <span className="font-medium">درجة النجاح:</span> {exam.passingScore}
              </span>
              <span className="flex items-center gap-1">
                <span className="font-medium">المدة:</span> {exam.durationMinutes} دقيقة
              </span>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4 mb-6">
            {exam.questions && exam.questions.length > 0 ? (
              exam.questions.map((question, index) => (
                <div
                  key={question.id}
                  ref={(el) => { questionRefs.current[question.id] = el; }}
                  data-question-id={question.id}
                  className={`bg-white rounded-xl border-2 p-5 transition-all ${
                    isQuestionAnswered(question.id)
                      ? 'border-emerald-200'
                      : 'border-stone-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        isQuestionAnswered(question.id)
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[#1a3a2f] text-white'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-stone-800 font-medium whitespace-pre-wrap">{question.prompt}</p>
                        {question.images && question.images.length > 0 && (
                          <ImageLightbox images={question.images} maxHeight="max-h-56" thumbWidth={500} thumbHeight={350} />
                        )}
                        <p className="text-xs text-stone-500 mt-1">{question.points} نقطة</p>
                      </div>
                    </div>
                    {isQuestionAnswered(question.id) && (
                      <CheckCircleIcon size={20} className="text-emerald-500 flex-shrink-0" />
                    )}
                  </div>

                  {question.type === 'MULTIPLE_CHOICE' && question.choices && question.choices.length > 0 && (
                    <div className="space-y-2 mr-11">
                      {question.choices.map((choice: string, choiceIndex: number) => (
                        <label
                          key={choiceIndex}
                          className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition ${
                            answers[question.id] === choiceIndex
                              ? 'border-[#1a3a2f] bg-[#1a3a2f]/5'
                              : 'border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={choiceIndex}
                            checked={answers[question.id] === choiceIndex}
                            onChange={() => handleAnswerChange(question.id, choiceIndex)}
                            className="w-4 h-4 text-[#1a3a2f]"
                          />
                          <span className="mr-3 text-stone-800">{choice}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === 'TEXT' && (
                    <div className="mr-11">
                      <input
                        type="text"
                        value={answers[question.id] || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f] text-stone-800"
                        placeholder="اكتب إجابتك هنا..."
                      />
                    </div>
                  )}

                  {question.type === 'ESSAY' && (
                    <div className="mr-11">
                      <textarea
                        value={answers[question.id] || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        rows={5}
                        className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f] text-stone-800"
                        placeholder="اكتب إجابتك هنا..."
                      />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
                <p className="text-stone-600 mb-2">لا توجد أسئلة في هذا الامتحان</p>
                <p className="text-sm text-stone-500">يرجى التواصل مع المعلم لإضافة أسئلة</p>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 sticky bottom-4 shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-stone-600">
                  <span className="font-bold text-emerald-600">{answeredCount}</span> من {exam.questions.length} سؤال
                </span>
                {unansweredCount > 0 && (
                  <span className="text-amber-600">
                    ({unansweredCount} متبقي)
                  </span>
                )}
              </div>
              <button
                onClick={handleSubmitClick}
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3 bg-[#1a3a2f] text-white rounded-xl font-bold hover:bg-[#2d5a4a] transition disabled:opacity-50"
              >
                {submitting ? 'جاري التسليم...' : 'تسليم الامتحان'}
              </button>
            </div>
          </div>
      </div>
    </div>
  );
}
