'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { 
  AlertIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  EyeIcon,
  FilterIcon,
  BookIcon,
  TrashIcon
} from '@/components/Icons';
import { showSuccess, showError, TOAST_MESSAGES } from '@/lib/toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useConfirmDialog } from '@/lib/useConfirmDialog';
import { formatDate } from '@/lib/utils';
import { Pagination, PaginationInfo, PaginatedResponse } from '@/components/Pagination';
import PageLoading from '@/components/PageLoading';

interface Report {
  id: string;
  type: string;
  description: string;
  timestamp?: string;
  status: string;
  createdAt: string;
  reviewNote?: string;
  resolvedAt?: string;
  reporter: { id: string; name: string; email: string };
  course: { id: string; title: string; teacherId: string };
  lesson: { id: string; title: string; order: number; module: { order: number; title: string } };
  reviewer?: { id: string; name: string };
}

const STATUS_OPTIONS = [
  { value: '', label: 'جميع الحالات' },
  { value: 'NEW', label: 'جديد' },
  { value: 'IN_REVIEW', label: 'قيد المراجعة' },
  { value: 'RESOLVED', label: 'تم الحل' },
  { value: 'DISMISSED', label: 'مرفوض' },
];

const TYPE_LABELS: Record<string, string> = {
  VIDEO_ERROR: 'خطأ في الفيديو',
  TEXT_ERROR: 'خطأ في النص',
  AUDIO_ERROR: 'خطأ في الصوت',
  RESOURCE_ERROR: 'خطأ في المرفقات',
  CONTENT_MISSING: 'محتوى ناقص',
  OTHER: 'أخرى',
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'جديد',
  IN_REVIEW: 'قيد المراجعة',
  RESOLVED: 'تم الحل',
  DISMISSED: 'مرفوض',
};

const STATUS_STYLES: Record<string, string> = {
  NEW: 'bg-red-50 text-red-700 border-red-200',
  IN_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DISMISSED: 'bg-stone-100 text-stone-600 border-stone-200',
};

const POLLING_INTERVAL = 60000; // 1 minute
const ITEMS_PER_PAGE = 15;

export default function TeacherReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const { confirm, isOpen: confirmOpen, options: confirmOptions, handleConfirm, handleClose: handleConfirmClose } = useConfirmDialog();

  const loadReports = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', currentPage.toString());
      params.append('limit', ITEMS_PER_PAGE.toString());
      
      const res = await api.get(`/reports?${params.toString()}`);
      const data = res.data as PaginatedResponse<Report>;
      setReports(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalReports(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, currentPage]);

  // Initial load
  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Polling for real-time updates
  useEffect(() => {
    const interval = setInterval(loadReports, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [loadReports]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const updateStatus = async (reportId: string, status: string, reviewNote?: string) => {
    setUpdating(reportId);
    try {
      await api.patch(`/reports/${reportId}`, { status, reviewNote });
      showSuccess(TOAST_MESSAGES.UPDATE_SUCCESS);
      loadReports(); // Refresh list
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل تحديث الحالة');
    } finally {
      setUpdating(null);
    }
  };

  const deleteReport = async (reportId: string) => {
    const ok = await confirm({ message: 'هل أنت متأكد من حذف هذا التبليغ؟', title: 'حذف التبليغ', variant: 'danger' });
    if (!ok) return;
    
    setDeleting(reportId);
    try {
      await api.delete(`/reports/${reportId}`);
      showSuccess(TOAST_MESSAGES.DELETE_SUCCESS);
      loadReports(); // Refresh list
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل حذف التبليغ');
    } finally {
      setDeleting(null);
    }
  };

  if (loading && reports.length === 0) {
    return (
      <PageLoading 
        title="التبليغات" 
        icon={<AlertIcon className="text-white" size={20} />}
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
              <AlertIcon className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold">تبليغات الطلاب</h1>
              <p className="text-white/70 text-sm">إدارة تبليغات الطلاب عن أخطاء في محتوى دوراتك (فيديو، نص، مرفقات)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center">
                <AlertIcon className="text-stone-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">{totalReports}</p>
                <p className="text-xs text-stone-500">إجمالي التبليغات</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <AlertIcon className="text-red-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">{reports.filter(r => r.status === 'NEW').length}</p>
                <p className="text-xs text-stone-500">جديد</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <ClockIcon className="text-amber-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">{reports.filter(r => r.status === 'IN_REVIEW').length}</p>
                <p className="text-xs text-stone-500">قيد المراجعة</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="text-emerald-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">{reports.filter(r => r.status === 'RESOLVED').length}</p>
                <p className="text-xs text-stone-500">تم الحل</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FilterIcon size={18} className="text-stone-500" />
            <span className="text-sm font-medium text-stone-700">تصفية</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setStatusFilter(opt.value);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-sm transition ${
                  statusFilter === opt.value
                    ? 'bg-[#1a3a2f] text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pagination Info */}
        {reports.length > 0 && (
          <div className="mb-4">
            <PaginationInfo
              currentPage={currentPage}
              limit={ITEMS_PER_PAGE}
              total={totalReports}
              itemName="تبليغ"
            />
          </div>
        )}

        {/* Reports List */}
        {reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="text-stone-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">لا توجد تبليغات</h3>
            <p className="text-stone-500">جميع محتويات دوراتك سليمة</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className={`bg-white rounded-xl shadow-sm border-r-4 p-5 transition-all ${
                  report.status === 'NEW' ? 'border-red-500' : 
                  report.status === 'IN_REVIEW' ? 'border-amber-500' :
                  report.status === 'RESOLVED' ? 'border-emerald-500' :
                  'border-stone-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Report Info */}
                  <div className="flex-1">
                    {/* Course & Lesson */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <BookIcon className="text-stone-400 shrink-0" size={16} />
                      <span className="font-medium text-stone-800">{report.course.title}</span>
                      <span className="text-stone-400">|</span>
                      <span className="text-stone-600">
                        الدرس {report.lesson.module.order}.{report.lesson.order}: {report.lesson.title}
                      </span>
                    </div>
                    
                    {/* Type & Status */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded text-xs font-medium">
                        {TYPE_LABELS[report.type] || report.type}
                      </span>
                      {report.timestamp && (
                        <span className="px-2 py-1 bg-sky-50 text-sky-600 rounded text-xs font-medium flex items-center gap-1">
                          <ClockIcon size={12} /> {report.timestamp}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${STATUS_STYLES[report.status]}`}>
                        {STATUS_LABELS[report.status] || report.status}
                      </span>
                    </div>
                    
                    {/* Description */}
                    <p className="text-stone-700 mb-3 whitespace-pre-wrap">{report.description}</p>
                    
                    {/* Review Note */}
                    {report.reviewNote && (
                      <div className="mb-3 p-3 bg-stone-50 rounded-lg border border-stone-100">
                        <p className="text-sm text-stone-600">
                          <span className="font-medium">ملاحظة المراجعة:</span> {report.reviewNote}
                        </p>
                      </div>
                    )}
                    
                    {/* Meta */}
                    <div className="flex items-center gap-4 text-sm text-stone-500 flex-wrap">
                      <span>من: <span className="font-medium text-stone-700">{report.reporter.name}</span></span>
                      <span>{formatDate(report.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link
                      href={`/teacher/courses/${report.course.id}/edit`}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100 transition text-sm font-medium"
                    >
                      تحرير الدورة
                    </Link>
                    
                    {report.status === 'NEW' && (
                      <button
                        onClick={() => updateStatus(report.id, 'IN_REVIEW')}
                        disabled={updating === report.id}
                        className="px-3 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition text-sm disabled:opacity-50"
                      >
                        {updating === report.id ? '...' : 'بدء المراجعة'}
                      </button>
                    )}
                    
                    {report.status === 'IN_REVIEW' && (
                      <>
                        <button
                          onClick={() => updateStatus(report.id, 'RESOLVED')}
                          disabled={updating === report.id}
                          className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition text-sm disabled:opacity-50"
                        >
                          {updating === report.id ? '...' : 'تم الحل'}
                        </button>
                        <button
                          onClick={() => updateStatus(report.id, 'DISMISSED')}
                          disabled={updating === report.id}
                          className="px-3 py-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition text-sm disabled:opacity-50"
                        >
                          {updating === report.id ? '...' : 'رفض'}
                        </button>
                      </>
                    )}
                    
                    {/* Delete button - available for all statuses */}
                    <button
                      onClick={() => deleteReport(report.id)}
                      disabled={deleting === report.id}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium disabled:opacity-50"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6">
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
      <ConfirmDialog isOpen={confirmOpen} onClose={handleConfirmClose} onConfirm={handleConfirm} {...confirmOptions} />
    </div>
  );
}
