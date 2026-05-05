'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { ExamIcon, PlusIcon, EditIcon, TrashIcon, ClockIcon, ChartIcon, UsersIcon } from '@/components/Icons';
import PageLoading from '@/components/PageLoading';
import { showError, showWarning } from '@/lib/toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useConfirmDialog } from '@/lib/useConfirmDialog';
import { Pagination, PaginationInfo } from '@/components/Pagination';

const ITEMS_PER_PAGE = 10;

interface Exam {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  startDate: string;
  endDate: string;
  maxScore: number;
  passingScore: number;
  maxAttempts?: number;
  retakeScorePercent?: number;
  course: { title: string };
  _count: { attempts: number; questions: number };
}

export default function AdminExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { confirm, isOpen: confirmOpen, options: confirmOptions, handleConfirm, handleClose: handleConfirmClose } = useConfirmDialog();
  const [formData, setFormData] = useState({
    courseId: '',
    title: '',
    description: '',
    durationMinutes: 60,
    startDate: '',
    endDate: '',
    maxScore: 100,
    passingScore: 60,
    maxAttempts: 2,
    retakeScorePercent: 75,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [coursesRes] = await Promise.all([
        api.get('/courses/admin'), // Use admin endpoint to get all courses including DRAFT
      ]);
      setCourses(coursesRes.data || []);
      // Load exams for all courses
      const allExams: Exam[] = [];
      for (const course of coursesRes.data || []) {
        try {
          const examsRes = await api.get(`/exams/course/${course.id}`);
          // Ensure each exam has course info
          const examsWithCourse = (examsRes.data || []).map((exam: any) => ({
            ...exam,
            course: exam.course || { title: course.title },
          }));
          allExams.push(...examsWithCourse);
        } catch (e) {
          // Skip if no exams
        }
      }
      setExams(allExams);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseId) {
      showWarning('يجب اختيار دورة');
      return;
    }
    // Validate dates
    const startDateTime = new Date(formData.startDate);
    const endDateTime = new Date(formData.endDate);
    const now = new Date();
    if (startDateTime.getTime() < now.getTime() - 60000) {
      showWarning('تاريخ ووقت البدء لا يمكن أن يكون في الماضي');
      return;
    }
    if (endDateTime.getTime() <= startDateTime.getTime()) {
      showWarning('تاريخ ووقت الانتهاء يجب أن يكون بعد تاريخ ووقت البدء');
      return;
    }
    try {
      await api.post('/exams', formData);
      setShowForm(false);
      setFormData({
        courseId: '',
        title: '',
        description: '',
        durationMinutes: 60,
        startDate: '',
        endDate: '',
        maxScore: 100,
        passingScore: 60,
        maxAttempts: 2,
        retakeScorePercent: 75,
      });
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل إنشاء الامتحان');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ message: 'هل أنت متأكد من حذف هذا الامتحان؟', title: 'حذف الامتحان', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/exams/${id}`);
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل حذف الامتحان');
    }
  };

  const totalAttempts = exams.reduce((sum, e) => sum + (e._count?.attempts || 0), 0);

  // Client-side pagination
  const totalPages = Math.ceil(exams.length / ITEMS_PER_PAGE);
  const paginatedExams = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return exams.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [exams, currentPage]);

  // Reset to page 1 if current page exceeds total pages after data changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [exams.length, totalPages, currentPage]);

  if (loading && exams.length === 0) {
    return <PageLoading title="الامتحانات" icon={<ExamIcon size={24} />} />;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <ExamIcon size={24} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">إدارة الامتحانات</h1>
                <p className="text-white/70 text-sm">{exams.length} امتحان</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#c9a227] text-white rounded-xl font-bold hover:bg-[#b08f20] transition-all shadow-lg"
            >
              <PlusIcon size={18} />
              امتحان جديد
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <p className="text-2xl font-bold text-[#1a3a2f]">{exams.length}</p>
            <p className="text-sm text-stone-500">إجمالي الامتحانات</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <p className="text-2xl font-bold text-sky-600">{totalAttempts}</p>
            <p className="text-sm text-stone-500">إجمالي التقديمات</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100 hidden md:block">
            <p className="text-2xl font-bold text-amber-600">{courses.length}</p>
            <p className="text-sm text-stone-500">دورات بها امتحانات</p>
          </div>
        </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6 mb-6" style={{ overflow: 'visible', position: 'relative', zIndex: 100 }}>
          <h2 className="text-xl font-bold text-stone-800 mb-6">إنشاء امتحان جديد</h2>
          <form onSubmit={handleSubmit} className="space-y-5" style={{ overflow: 'visible', position: 'relative' }}>
            <div className="relative w-full">
              <label className="block text-lg font-semibold mb-3 text-gray-800">الدورة *</label>
              <div className="relative w-full">
                {/* Custom Dropdown */}
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium text-right flex items-center justify-between"
                  style={{ minHeight: '56px' }}
                >
                  <span className="flex-1 text-right">
                    {formData.courseId 
                      ? courses.find(c => c.id === formData.courseId)?.title || 'اختر الدورة'
                      : 'اختر الدورة'
                    }
                  </span>
                  <svg 
                    className={`w-5 h-5 transition-transform ${dropdownOpen ? 'transform rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div 
                      className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      style={{ direction: 'rtl' }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, courseId: '' });
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-right px-4 py-3 text-lg hover:bg-gray-100 transition ${
                          formData.courseId === '' ? 'bg-primary text-white' : 'text-gray-800'
                        }`}
                      >
                        اختر الدورة
                      </button>
                      {courses.map((course) => (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, courseId: course.id });
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-right px-4 py-3 text-lg hover:bg-gray-100 transition border-t border-gray-200 ${
                            formData.courseId === course.id ? 'bg-primary text-white' : 'text-gray-800'
                          }`}
                        >
                          {course.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {courses.length === 0 && (
                <p className="text-sm text-yellow-600 mt-2">جاري تحميل الدورات...</p>
              )}
              {!formData.courseId && (
                <p className="text-sm text-red-600 mt-1">يجب اختيار دورة</p>
              )}
            </div>

            <div>
              <label className="block text-lg font-semibold mb-3">عنوان الامتحان</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary"
                placeholder="مثال: امتحان منتصف الفصل"
              />
            </div>

            <div>
              <label className="block text-lg font-semibold mb-3">الوصف</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary"
                placeholder="وصف الامتحان..."
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-lg font-semibold mb-3">مدة الامتحان (دقيقة)</label>
                <input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                  required
                  min="1"
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-lg font-semibold mb-3">الدرجة الكاملة</label>
                <input
                  type="number"
                  value={formData.maxScore}
                  onChange={(e) => setFormData({ ...formData, maxScore: parseFloat(e.target.value) })}
                  required
                  min="1"
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-lg font-semibold mb-3">تاريخ البدء</label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-lg font-semibold mb-3">تاريخ الانتهاء</label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-lg font-semibold mb-3">درجة النجاح</label>
              <input
                type="number"
                value={formData.passingScore}
                onChange={(e) => setFormData({ ...formData, passingScore: parseFloat(e.target.value) })}
                required
                min="0"
                max={formData.maxScore}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Retake Settings */}
            <div className="border-t border-gray-200 pt-6 mt-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-stone-700">إعدادات الإعادة</h3>
              </div>

              <div className="bg-stone-50 rounded-xl p-5 space-y-5">
                {/* Toggle: unlimited retakes */}
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div>
                    <p className="font-semibold text-stone-700">إعادة حتى النجاح</p>
                    <p className="text-sm text-stone-400 mt-0.5">السماح بالإعادة بدون حد حتى يجتاز الطالب</p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.maxAttempts === 0}
                      onChange={(e) => setFormData({ ...formData, maxAttempts: e.target.checked ? 0 : 2 })}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-7 bg-stone-300 peer-checked:bg-primary rounded-full transition-colors duration-200" />
                    <div className="absolute top-0.5 right-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-200 peer-checked:-translate-x-5" />
                  </div>
                </label>

                {/* Max attempts input — only when NOT unlimited */}
                {formData.maxAttempts !== 0 && (
                  <div className="border-t border-stone-200 pt-4">
                    <label className="block font-semibold text-stone-700 mb-2">عدد المحاولات</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, maxAttempts: Math.max(1, formData.maxAttempts - 1) })}
                        className="w-10 h-10 rounded-lg border-2 border-stone-300 bg-white text-stone-600 font-bold text-xl hover:border-primary hover:text-primary transition flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="w-14 text-center text-2xl font-bold text-stone-800">{formData.maxAttempts}</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, maxAttempts: formData.maxAttempts + 1 })}
                        className="w-10 h-10 rounded-lg border-2 border-stone-300 bg-white text-stone-600 font-bold text-xl hover:border-primary hover:text-primary transition flex items-center justify-center"
                      >
                        +
                      </button>
                      <span className="text-sm text-stone-400 mr-2">
                        {formData.maxAttempts === 1 ? 'محاولة واحدة فقط (بدون إعادة)' : `${formData.maxAttempts - 1} إعادة مسموحة`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Retake score percent */}
                <div className="border-t border-stone-200 pt-4">
                  <label className="block font-semibold text-stone-700 mb-2">نسبة احتساب درجة الإعادة</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-[200px]">
                      <input
                        type="number"
                        value={formData.retakeScorePercent}
                        onChange={(e) => setFormData({ ...formData, retakeScorePercent: Math.max(1, Math.min(100, parseFloat(e.target.value) || 75)) })}
                        min="1"
                        max="100"
                        className="w-full px-4 py-2.5 text-lg border-2 border-stone-300 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary pl-10"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">%</span>
                    </div>
                    <span className="text-sm text-stone-500">
                      من الدرجة الكاملة ({formData.maxScore})
                      {' '}={' '}
                      <span className="font-bold text-stone-700">
                        {Math.round(formData.maxScore * (formData.retakeScorePercent / 100))}
                      </span>
                      {' '}كحد أقصى
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="px-8 py-4 bg-primary text-white rounded-lg font-bold text-lg hover:bg-primary-dark transition btn-large"
              >
                حفظ
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-8 py-4 bg-gray-200 text-gray-700 rounded-lg font-bold text-lg hover:bg-gray-300 transition btn-large"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

        {/* Exams Table */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
          {exams.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExamIcon size={32} className="text-stone-400" />
              </div>
              <p className="text-stone-500 text-lg mb-4">لا توجد امتحانات</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a3a2f] text-white rounded-xl font-bold hover:bg-[#143026] transition"
              >
                <PlusIcon size={18} />
                إنشاء امتحان جديد
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">الامتحان</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider hidden md:table-cell">الدورة</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider hidden lg:table-cell">المدة</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider hidden sm:table-cell">تاريخ البدء</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider hidden sm:table-cell">الإعادة</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">التقديمات</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginatedExams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <h3 className="font-semibold text-stone-800">{exam.title}</h3>
                          {exam.description && (
                            <p className="text-sm text-stone-500 mt-1 line-clamp-1">{exam.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-600 hidden md:table-cell">{exam.course?.title || 'غير محدد'}</td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-stone-600">
                          <ClockIcon size={14} />
                          <span className="text-sm">{exam.durationMinutes} دقيقة</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-600 hidden sm:table-cell">
                        {formatDate(exam.startDate)}
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        {(() => {
                          const max = exam.maxAttempts ?? 2;
                          const pct = exam.retakeScorePercent ?? 75;
                          if (max === 1) {
                            return (
                              <div className="space-y-1">
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-50 text-red-600">
                                  بدون إعادة
                                </span>
                                <p className="text-[11px] text-stone-400">محاولة واحدة فقط</p>
                              </div>
                            );
                          }
                          return (
                            <div className="space-y-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${max === 0 ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}`}>
                                {max === 0 ? 'حتى النجاح' : `${max} محاولات`}
                              </span>
                              <p className="text-[11px] text-stone-400">{pct}% من الدرجة</p>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-stone-600">
                          <UsersIcon size={14} />
                          <span className="text-sm font-medium">{exam._count?.attempts || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link
                            href={`/admin/exams/${exam.id}`}
                            className="px-3 py-1.5 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100 transition text-sm font-medium"
                          >
                            الأسئلة
                          </Link>
                          <Link
                            href={`/admin/exams/${exam.id}/attempts`}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition text-sm font-medium"
                          >
                            التقديمات
                          </Link>
                          <button
                            onClick={() => handleDelete(exam.id)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {exams.length > ITEMS_PER_PAGE && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <PaginationInfo
              currentPage={currentPage}
              limit={ITEMS_PER_PAGE}
              total={exams.length}
              itemName="امتحان"
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
      <ConfirmDialog isOpen={confirmOpen} onClose={handleConfirmClose} onConfirm={handleConfirm} {...confirmOptions} />
    </div>
  );
}

