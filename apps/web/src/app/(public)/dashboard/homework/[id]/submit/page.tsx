'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { BookIcon, ClockIcon, HomeworkIcon } from '@/components/Icons';
import { showSuccess, showError, TOAST_MESSAGES } from '@/lib/toast';
import { formatDate } from '@/lib/utils';
import PageLoading from '@/components/PageLoading';

interface Homework {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
  course: { title: string; id: string };
}

export default function SubmitHomeworkPage() {
  const params = useParams();
  const router = useRouter();
  const [homework, setHomework] = useState<Homework | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    content: '',
    attachments: '',
  });

  useEffect(() => {
    loadHomework();
  }, [params.id]);

  const loadHomework = async () => {
    try {
      const homeworkId = Array.isArray(params.id) ? params.id[0] : params.id;
      const response = await api.get(`/homework/${homeworkId}`);
      setHomework(response.data);
    } catch (error: any) {
      console.error('Failed to load homework:', error);
      showError(error.response?.data?.message || 'فشل تحميل الواجب');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.content.trim()) {
      showError('يرجى إدخال محتوى الواجب');
      return;
    }

    setSubmitting(true);
    try {
      const homeworkId = Array.isArray(params.id) ? params.id[0] : params.id;
      await api.post(`/homework/${homeworkId}/submit`, {
        content: formData.content.trim(),
        attachments: formData.attachments.trim() || undefined,
      });
      showSuccess(TOAST_MESSAGES.HOMEWORK_SUBMIT_SUCCESS);
      router.push('/dashboard/homework');
    } catch (error: any) {
      console.error('Failed to submit homework:', error);
      showError(error.response?.data?.message || TOAST_MESSAGES.HOMEWORK_SUBMIT_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageLoading 
        title="جاري تحميل الواجب..." 
        icon={<HomeworkIcon className="text-white" size={20} />}
      />
    );
  }

  if (!homework) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center max-w-md">
          <p className="text-lg text-stone-600 mb-4">الواجب غير موجود</p>
          <Link
            href="/dashboard/homework"
            className="px-6 py-2 bg-[#1a3a2f] text-white rounded-lg hover:bg-[#2d5a4a] transition inline-block"
          >
            العودة للواجبات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <BookIcon className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold">تسليم الواجب</h1>
              <p className="text-white/70 text-sm">{homework.course.title}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Homework Details */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-stone-800 mb-3">{homework.title}</h2>
          <p className="text-stone-600 whitespace-pre-wrap mb-4">{homework.description}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-stone-600">
              <ClockIcon size={16} />
              <span>تاريخ الاستحقاق: {formatDate(homework.dueDate)}</span>
            </div>
            <div className="px-3 py-1 bg-stone-100 rounded-lg text-stone-700">
              الدرجة الكاملة: {homework.maxScore}
            </div>
          </div>
        </div>

        {/* Submit Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="text-lg font-bold text-stone-800 mb-4">إرسال الواجب</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-stone-700">
              محتوى الواجب
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              rows={10}
              className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f] text-stone-800"
              placeholder="اكتب إجابتك هنا..."
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-stone-700">
              روابط المرفقات (اختياري)
            </label>
            <input
              type="text"
              value={formData.attachments}
              onChange={(e) => setFormData({ ...formData, attachments: e.target.value })}
              className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f] text-stone-800"
              placeholder="رابط ملف أو صورة (مثال: https://example.com/file.pdf)"
            />
            <p className="text-xs text-stone-500 mt-2">
              يمكنك إضافة روابط للملفات أو الصور
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-[#1a3a2f] text-white rounded-lg font-medium hover:bg-[#2d5a4a] transition disabled:opacity-50"
            >
              {submitting ? 'جاري الإرسال...' : 'تسليم الواجب'}
            </button>
            <Link
              href="/dashboard/homework"
              className="px-6 py-3 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition"
            >
              إلغاء
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
