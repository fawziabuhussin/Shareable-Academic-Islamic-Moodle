'use client';

import { useState } from 'react';
import { AlertIcon, CheckCircleIcon, CloseIcon } from '@/components/Icons';
import api from '@/lib/api';
import Modal from '@/components/Modal';

interface ReportErrorButtonProps {
  courseId: string;
  courseName: string;
  lessonId: string;
  lessonTitle: string;
  lessonOrder: number;
  moduleOrder: number;
}

const REPORT_TYPES = [
  { value: 'VIDEO_ERROR', label: 'خطأ في الفيديو' },
  { value: 'TEXT_ERROR', label: 'خطأ في النص' },
  { value: 'AUDIO_ERROR', label: 'خطأ في الصوت' },
  { value: 'RESOURCE_ERROR', label: 'خطأ في المرفقات' },
  { value: 'CONTENT_MISSING', label: 'محتوى ناقص' },
  { value: 'OTHER', label: 'أخرى' },
];

export default function ReportErrorButton({
  courseId,
  courseName,
  lessonId,
  lessonTitle,
  lessonOrder,
  moduleOrder,
}: ReportErrorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: 'VIDEO_ERROR',
    description: '',
    timestamp: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      setError('يرجى وصف الخطأ');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.post('/reports', {
        courseId,
        lessonId,
        type: formData.type,
        description: formData.description.trim(),
        timestamp: formData.timestamp || undefined,
      });
      
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setFormData({ type: 'VIDEO_ERROR', description: '', timestamp: '' });
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل إرسال التبليغ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    setSubmitted(false);
    setFormData({ type: 'VIDEO_ERROR', description: '', timestamp: '' });
  };

  return (
    <>
      {/* Report Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
        title="تبليغ عن خطأ"
      >
        <AlertIcon size={18} />
        <span className="text-sm font-medium">تبليغ عن خطأ</span>
      </button>

      {/* Modal */}
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="تبليغ عن خطأ بالمادة"
        size="md"
      >
        {/* Context Info */}
        <div className="mb-6 p-4 bg-stone-50 rounded-lg">
          <p className="text-stone-600 text-sm">
            <span className="font-medium">المساق:</span> {courseName}
          </p>
          <p className="text-stone-600 text-sm mt-1">
            <span className="font-medium">الدرس:</span> {moduleOrder}.{lessonOrder} - {lessonTitle}
          </p>
        </div>

        {/* Form */}
        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                نوع الخطأ
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] text-stone-800 bg-white"
              >
                {REPORT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Timestamp (for video errors) */}
            {formData.type === 'VIDEO_ERROR' && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  وقت الخطأ في الفيديو (اختياري)
                </label>
                <input
                  type="text"
                  value={formData.timestamp}
                  onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
                  placeholder="مثال: 05:23"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] text-stone-800 bg-white"
                />
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                وصف الخطأ *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={4}
                placeholder="اشرح الخطأ الذي وجدته بالتفصيل..."
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] text-stone-800 bg-white resize-none"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-[#1a3a2f] text-white rounded-lg hover:bg-[#143026] transition-colors font-medium disabled:opacity-50"
              >
                {submitting ? 'جاري الإرسال...' : 'إرسال التبليغ'}
              </button>
            </div>
          </form>
        ) : (
          /* Success State */
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="text-emerald-600" size={32} />
            </div>
            <h3 className="text-lg font-bold text-stone-800 mb-2">تم إرسال التبليغ</h3>
            <p className="text-stone-500">شكراً لمساعدتك في تحسين المحتوى</p>
          </div>
        )}
      </Modal>
    </>
  );
}
