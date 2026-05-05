'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { showSuccess, showError } from '@/lib/toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { StarIcon } from '@/components/Icons';
import { FileText, ClipboardList, HelpCircle, BookOpen, Lock, Unlock, UserPlus, Download } from 'lucide-react';
import ManualGradeModal from './ManualGradeModal';
import { getLetterGradeColor, getGradeCellBg, getLetterGrade } from '@/lib/grades';
import { exportCourseGrades } from '@/lib/excelExport';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AssessmentScore {
  id: string;
  type: 'EXAM' | 'HOMEWORK' | 'QUIZ';
  title: string;
  score: number | null;
  effectiveScore?: number | null;
  maxScore: number;
  weightPercent: number;
  isRetake?: boolean;
}

export interface StudentGrade {
  userId: string;
  studentName: string;
  studentEmail: string;
  enrollmentId: string;
  assessments: AssessmentScore[];
  lessonCompletionPercent: number;
  projectedGrade: { percentage: number; weightCovered: number };
  finalScore: number | null;
  overrideScore: number | null;
  effectiveScore: number | null;
  letterGrade: string | null;
  finalizedAt: string | null;
}

export interface WeightSummary {
  readingWeight: number;
  assessments: Array<{ id: string; type: string; title: string; weightPercent: number }>;
  total: number;
  isValid: boolean;
  remaining: number;
}

export interface CourseGradesResponse {
  students: StudentGrade[];
  weightSummary: WeightSummary;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CourseGradesViewProps {
  courseId: string;
  /** API path to fetch the course list for title lookup */
  coursesListApi: string;
  /** Path prefix for back link, e.g. "/admin/grades" or "/teacher/grades" */
  backHref: string;
  /** Link to the course edit page for updating weights */
  courseEditHref: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'EXAM': return <FileText size={16} />;
    case 'HOMEWORK': return <ClipboardList size={16} />;
    case 'QUIZ': return <HelpCircle size={16} />;
    default: return null;
  }
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function CourseGradesView({
  courseId,
  coursesListApi,
  backHref,
  courseEditHref,
}: CourseGradesViewProps) {
  const [courseTitle, setCourseTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [gradesData, setGradesData] = useState<CourseGradesResponse | null>(null);
  const [overrideStudentId, setOverrideStudentId] = useState<string | null>(null);
  const [overrideScore, setOverrideScore] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [finalizingStudentUserId, setFinalizingStudentUserId] = useState<string | null>(null);
  const [showManualGradeModal, setShowManualGradeModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadCourseGrades();
    loadCourseTitle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const loadCourseTitle = async () => {
    try {
      const res = await api.get(coursesListApi);
      const courses = res.data || [];
      const course = courses.find((c: any) => c.id === courseId);
      if (course) setCourseTitle(course.title);
    } catch (error) {
      console.error('Failed to load course title:', error);
    }
  };

  const loadCourseGrades = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/grades/course/${courseId}`);
      setGradesData(res.data);
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل في تحميل الدرجات');
      setGradesData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      await api.post(`/grades/course/${courseId}/finalize`);
      showSuccess('تم اعتماد الدرجات بنجاح');
      setShowFinalizeConfirm(false);
      loadCourseGrades();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل في اعتماد الدرجات');
    } finally {
      setFinalizing(false);
    }
  };

  const handleReopen = async () => {
    setReopening(true);
    try {
      await api.post(`/grades/course/${courseId}/reopen`);
      showSuccess('تم إعادة فتح الدرجات بنجاح');
      setShowReopenConfirm(false);
      loadCourseGrades();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل في إعادة فتح الدرجات');
    } finally {
      setReopening(false);
    }
  };

  const handleFinalizeStudent = async (userId: string) => {
    setFinalizingStudentUserId(userId);
    try {
      await api.post(`/grades/course/${courseId}/student/${userId}/finalize`);
      showSuccess('تم اعتماد درجة الطالب بنجاح');
      loadCourseGrades();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل في اعتماد درجة الطالب');
    } finally {
      setFinalizingStudentUserId(null);
    }
  };

  const handleOverride = async (userId: string) => {
    if (!overrideScore) return;
    const student = gradesData?.students?.find(s => s.userId === userId);
    const isAdding = student?.finalScore === null && student?.overrideScore === null;
    try {
      await api.post(`/grades/course/${courseId}/student/${userId}/override`, {
        overrideScore: parseFloat(overrideScore),
      });
      showSuccess(isAdding ? 'تم إضافة الدرجة بنجاح' : 'تم تعديل الدرجة بنجاح');
      setOverrideStudentId(null);
      setOverrideScore('');
      loadCourseGrades();
    } catch (error: any) {
      showError(error.response?.data?.message || (isAdding ? 'فشل في إضافة الدرجة' : 'فشل في تعديل الدرجة'));
    }
  };

  const isFinalized = gradesData?.students?.some(s => s.finalizedAt !== null) || false;

  // Statistics
  const stats = useMemo(() => {
    if (!gradesData || gradesData.students.length === 0) return null;
    const students = gradesData.students;
    const finalizedStudents = students.filter(s => s.effectiveScore !== null);
    const avgFinal = finalizedStudents.length > 0
      ? finalizedStudents.reduce((sum, s) => sum + (s.effectiveScore ?? 0), 0) / finalizedStudents.length
      : null;

    const distribution: Record<string, number> = {};
    students.forEach(s => {
      const letter = s.letterGrade || getLetterGrade(s.projectedGrade.percentage);
      distribution[letter] = (distribution[letter] || 0) + 1;
    });

    const totalAssessments = students.reduce((sum, s) => sum + s.assessments.length, 0);
    const submittedAssessments = students.reduce((sum, s) => sum + s.assessments.filter(a => a.score !== null).length, 0);
    const submissionRate = totalAssessments > 0 ? (submittedAssessments / totalAssessments * 100) : 0;

    return { avgFinal, finalizedCount: finalizedStudents.length, distribution, submissionRate, totalStudents: students.length };
  }, [gradesData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <PageLoadingInline />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <StarIcon size={24} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">{courseTitle || 'إدارة التقييمات'}</h1>
                <p className="text-white/70 text-sm">عرض واعتماد درجات الطلاب</p>
              </div>
            </div>
            <Link
              href={backHref}
              className="px-5 py-2.5 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition"
            >
              ← العودة للدورات
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {gradesData && (
          <>
            {/* Statistics (admin only) */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5 border-r-4 border-r-[#1a3a2f]">
                  <p className="text-stone-500 text-sm mb-1">عدد الطلاب</p>
                  <p className="text-3xl font-bold text-[#1a3a2f]">{stats.totalStudents}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5 border-r-4 border-r-emerald-500">
                  <p className="text-stone-500 text-sm mb-1">متوسط الدرجات النهائية</p>
                  {stats.avgFinal !== null ? (
                    <p className="text-3xl font-bold text-emerald-600">{stats.avgFinal.toFixed(1)}%</p>
                  ) : (
                    <p className="text-lg font-medium text-stone-400">لم تُعتمد بعد</p>
                  )}
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5 border-r-4 border-r-sky-500">
                  <p className="text-stone-500 text-sm mb-1">نسبة التسليم</p>
                  <p className="text-3xl font-bold text-sky-600">{stats.submissionRate.toFixed(0)}%</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
                  <p className="text-stone-500 text-sm mb-2">توزيع التقديرات</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(stats.distribution).sort().map(([grade, count]) => (
                      <span key={grade} className={`px-2 py-0.5 rounded text-xs font-bold ${getLetterGradeColor(grade)}`}>
                        {grade}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Weight Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
              <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
                <h2 className="text-lg font-bold text-stone-800">توزيع الأوزان</h2>
                <div className="flex items-center gap-3">
                  {!gradesData.weightSummary.isValid && (
                    <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
                      المجموع: {gradesData.weightSummary.total}% (يجب أن يكون 100%)
                    </span>
                  )}
                  <Link
                    href={courseEditHref}
                    className="text-sm text-[#1a3a2f] hover:underline font-medium"
                  >
                    تعديل الأوزان ←
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                <div className="p-3 bg-stone-50 rounded-lg text-center">
                  <BookOpen size={18} className="mx-auto mb-1 text-stone-600" />
                  <p className="text-xs text-stone-500">القراءة والمتابعة</p>
                  <p className="text-lg font-bold text-stone-800">{gradesData.weightSummary.readingWeight}%</p>
                </div>
                {gradesData.weightSummary.assessments.map((a) => (
                  <div key={a.id} className="p-3 bg-stone-50 rounded-lg text-center">
                    <div className="flex justify-center mb-1 text-stone-600">{getTypeIcon(a.type)}</div>
                    <p className="text-xs text-stone-500 truncate">{a.title}</p>
                    <p className="text-lg font-bold text-stone-800">{a.weightPercent}%</p>
                  </div>
                ))}
              </div>
              <div className={`mt-3 text-center text-sm font-bold ${
                gradesData.weightSummary.isValid ? 'text-emerald-600' : 'text-red-600'
              }`}>
                الإجمالي: {gradesData.weightSummary.total}%
              </div>
            </div>

            {/* Finalization Status & Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {isFinalized ? (
                    <>
                      <Lock size={20} className="text-emerald-600" />
                      <div>
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold">معتمدة</span>
                        {gradesData.students[0]?.finalizedAt && (
                          <p className="text-xs text-stone-500 mt-1">
                            تم الاعتماد في {new Date(gradesData.students[0].finalizedAt).toLocaleDateString('ar')}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <Unlock size={20} className="text-amber-600" />
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-sm font-bold">قيد التقييم</span>
                    </>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowManualGradeModal(true)}
                    className="px-5 py-2.5 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 transition flex items-center gap-2"
                  >
                    <UserPlus size={16} />
                    إضافة درجة لطالب
                  </button>
                  <button
                    onClick={async () => {
                      if (!gradesData) return;
                      setExporting(true);
                      try {
                        await exportCourseGrades(courseTitle, gradesData);
                        showSuccess('تم تصدير الملف بنجاح');
                      } catch (err) {
                        console.error('Excel export failed:', err);
                        showError('فشل في تصدير الملف');
                      } finally {
                        setExporting(false);
                      }
                    }}
                    disabled={exporting}
                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    <Download size={16} />
                    {exporting ? 'جاري التصدير...' : 'تصدير إكسل'}
                  </button>
                  {!isFinalized ? (
                    <button
                      onClick={() => setShowFinalizeConfirm(true)}
                      disabled={!gradesData.weightSummary.isValid}
                      className="px-5 py-2.5 bg-[#1a3a2f] text-white rounded-lg font-medium hover:bg-[#134436] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Lock size={16} />
                      اعتماد الدرجات
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowReopenConfirm(true)}
                      className="px-5 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition flex items-center gap-2"
                    >
                      <Unlock size={16} />
                      إعادة فتح الدرجات
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Confirmation Modals */}
            <ConfirmDialog
              isOpen={showFinalizeConfirm}
              onClose={() => setShowFinalizeConfirm(false)}
              onConfirm={handleFinalize}
              title="تأكيد اعتماد الدرجات"
              message="هل أنت متأكد من اعتماد درجات جميع الطلاب في هذه الدورة؟"
              confirmText={finalizing ? 'جاري الاعتماد...' : 'تأكيد الاعتماد'}
              variant="warning"
              loading={finalizing}
            />
            <ConfirmDialog
              isOpen={showReopenConfirm}
              onClose={() => setShowReopenConfirm(false)}
              onConfirm={handleReopen}
              title="تأكيد إعادة فتح الدرجات"
              message="هل أنت متأكد من إعادة فتح الدرجات؟ سيتم إلغاء الاعتماد."
              confirmText={reopening ? 'جاري إعادة الفتح...' : 'تأكيد إعادة الفتح'}
              variant="warning"
              loading={reopening}
            />

            {/* Manual Grade Modal */}
            <ManualGradeModal
              isOpen={showManualGradeModal}
              onClose={() => setShowManualGradeModal(false)}
              courseId={courseId}
              onSuccess={loadCourseGrades}
            />

            {/* Students Table */}
            {gradesData.students.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <StarIcon className="text-stone-400" size={32} />
                </div>
                <h3 className="text-xl font-bold text-stone-800 mb-2">لا يوجد طلاب مسجلين</h3>
                <p className="text-stone-500">لا يوجد طلاب مسجلين في هذه الدورة بعد</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-stone-50 border-b border-stone-200">
                      <tr>
                        <th className="px-4 py-3 text-right text-sm font-bold text-stone-700 sticky right-0 bg-stone-50">الطالب</th>
                        {gradesData.weightSummary.assessments.map((a) => (
                          <th key={a.id} className="px-3 py-3 text-center text-xs font-bold text-stone-700">
                            <div className="flex items-center justify-center gap-1">
                              {getTypeIcon(a.type)}
                              <span className="truncate max-w-[80px]">{a.title}</span>
                            </div>
                            <span className="text-stone-400 font-normal">{a.weightPercent}%</span>
                          </th>
                        ))}
                        <th className="px-3 py-3 text-center text-xs font-bold text-stone-700">
                          <div className="flex items-center justify-center gap-1">
                            <BookOpen size={14} />
                            <span>القراءة</span>
                          </div>
                          <span className="text-stone-400 font-normal">{gradesData.weightSummary.readingWeight}%</span>
                        </th>
                        <th className="px-3 py-3 text-center text-sm font-bold text-stone-700">العلامة المتوقعة</th>
                        <th className="px-3 py-3 text-center text-sm font-bold text-white bg-[#1a3a2f] rounded-t-lg">الدرجة النهائية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {gradesData.students.map((student) => (
                        <tr key={student.userId} className="hover:bg-stone-50">
                          <td className="px-4 py-3 sticky right-0 bg-white">
                            <p className="font-bold text-stone-800 text-sm">{student.studentName}</p>
                            <p className="text-xs text-stone-500">{student.studentEmail}</p>
                          </td>
                          {gradesData.weightSummary.assessments.map((a) => {
                            const assessment = student.assessments.find(sa => sa.id === a.id);
                            return (
                              <td key={a.id} className="px-3 py-3 text-center text-sm">
                                {assessment && assessment.score !== null ? (
                                  <div>
                                    <span className="font-medium text-stone-800">
                                      {assessment.effectiveScore != null ? assessment.effectiveScore : assessment.score}/{assessment.maxScore}
                                    </span>
                                    {assessment.isRetake && (
                                      <span className="block text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded mt-0.5 mx-auto w-fit">إعادة</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-stone-400">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-3 text-center text-sm font-medium text-stone-800">
                            {student.lessonCompletionPercent}%
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="text-sm font-bold text-stone-800">
                              {student.projectedGrade.percentage.toFixed(1)}%
                            </div>
                            <p className="text-xs text-stone-400 mt-0.5">
                              ({student.projectedGrade.weightCovered}% من الوزن)
                            </p>
                            {!student.finalizedAt && (
                              <button
                                onClick={() => handleFinalizeStudent(student.userId)}
                                disabled={!gradesData.weightSummary.isValid || finalizingStudentUserId === student.userId}
                                className="mt-1.5 px-3 py-1 bg-[#1a3a2f] text-white rounded-lg text-xs hover:bg-[#134436] transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                              >
                                <Lock size={12} />
                                {finalizingStudentUserId === student.userId ? 'جاري الاعتماد...' : 'اعتماد العلامة'}
                              </button>
                            )}
                          </td>
                          <td className={`px-3 py-3 text-center ${getGradeCellBg(student.letterGrade || (student.effectiveScore != null ? getLetterGrade(student.effectiveScore) : null))}`}>
                            {overrideStudentId === student.userId ? (
                              <div className="flex items-center gap-2 justify-center">
                                <input
                                  type="number"
                                  min="0" max="100"
                                  value={overrideScore}
                                  onChange={(e) => setOverrideScore(e.target.value)}
                                  className="w-16 px-2 py-1 border border-stone-300 rounded text-sm text-center bg-white"
                                  placeholder="0-100"
                                />
                                <button onClick={() => handleOverride(student.userId)} className="px-2 py-1 bg-[#1a3a2f] text-white rounded text-xs hover:bg-[#134436] transition">حفظ</button>
                                <button onClick={() => { setOverrideStudentId(null); setOverrideScore(''); }} className="px-2 py-1 bg-stone-200 text-stone-600 rounded text-xs hover:bg-stone-300 transition">إلغاء</button>
                              </div>
                            ) : (
                              <div>
                                {student.finalScore !== null ? (
                                  <div>
                                    <p className="text-lg font-extrabold text-stone-800">{student.effectiveScore?.toFixed(1)}%</p>
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-0.5 ${getLetterGradeColor(student.letterGrade)}`}>
                                      {student.letterGrade}
                                    </span>
                                    {student.overrideScore !== null && (
                                      <p className="text-xs text-amber-600 mt-0.5">تعديل: {student.overrideScore}%</p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-stone-400 text-sm">—</span>
                                )}
                                <button
                                  onClick={() => { setOverrideStudentId(student.userId); setOverrideScore(student.overrideScore?.toString() || ''); }}
                                  className="mt-1.5 px-3 py-1 bg-stone-100 text-stone-700 rounded-lg text-xs hover:bg-stone-200 transition"
                                >
                                  {student.finalScore !== null || student.overrideScore !== null ? 'تعديل الدرجة' : 'إضافة درجة'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Simple inline loading fallback
function PageLoadingInline() {
  return (
    <div className="text-center py-12">
      <div className="w-10 h-10 border-4 border-stone-200 border-t-[#1a3a2f] rounded-full animate-spin mx-auto mb-4" />
      <p className="text-stone-500">جاري التحميل...</p>
    </div>
  );
}
