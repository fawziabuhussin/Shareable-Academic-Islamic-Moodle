'use client';

import { useState } from 'react';
import { HelpIcon, CheckCircleIcon } from '@/components/Icons';
import api from '@/lib/api';
import Modal from '@/components/Modal';

interface AskQuestionButtonProps {
  courseId: string;
  courseName: string;
  lessonId: string;
  lessonTitle: string;
  lessonOrder: number;
  moduleOrder: number;
}

export default function AskQuestionButton({
  courseId,
  courseName,
  lessonId,
  lessonTitle,
  lessonOrder,
  moduleOrder,
}: AskQuestionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setError('يرجى كتابة السؤال');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.post('/questions', {
        courseId,
        lessonId,
        question: question.trim(),
      });
      
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setQuestion('');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل إرسال السؤال');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    setSubmitted(false);
    setQuestion('');
  };

  return (
    <>
      {/* Question Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-[#1a3a2f] bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
        title="اطرح سؤالاً"
      >
        <HelpIcon size={18} />
        <span className="text-sm font-medium">اطرح سؤالاً</span>
      </button>

      {/* Modal */}
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="سؤال متعلق بالدرس"
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
            {/* Question */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                سؤالك
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                rows={5}
                placeholder="اكتب سؤالك هنا... سيتم إرساله للمدرس"
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
                {submitting ? 'جاري الإرسال...' : 'إرسال السؤال'}
              </button>
            </div>
          </form>
        ) : (
          /* Success State */
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="text-emerald-600" size={32} />
            </div>
            <h3 className="text-lg font-bold text-stone-800 mb-2">تم إرسال السؤال</h3>
            <p className="text-stone-500">سيتم الرد عليك من قبل المدرس</p>
          </div>
        )}
      </Modal>
    </>
  );
}
