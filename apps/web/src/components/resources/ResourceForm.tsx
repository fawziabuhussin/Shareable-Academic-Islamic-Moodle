'use client';

import { useState, useEffect } from 'react';
import { Resource, CreateResourceDTO } from '@/types/resource';

interface ResourceFormProps {
  initialData?: Partial<Resource>;
  onSubmit: (data: CreateResourceDTO) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

export default function ResourceForm({
  initialData,
  onSubmit,
  onCancel,
  isEditing = false,
}: ResourceFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    url: initialData?.url || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        url: initialData.url || '',
      });
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'العنوان مطلوب';
    } else if (formData.title.length > 200) {
      newErrors.title = 'العنوان طويل جداً';
    }

    // Description validation
    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'الوصف طويل جداً';
    }

    // URL validation
    if (!formData.url.trim()) {
      newErrors.url = 'الرابط مطلوب';
    } else {
      try {
        new URL(formData.url);
      } catch {
        newErrors.url = 'الرابط غير صحيح';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const submitData: CreateResourceDTO = {
        title: formData.title.trim(),
        url: formData.url.trim(),
      };

      if (formData.description.trim()) {
        submitData.description = formData.description.trim();
      }

      await onSubmit(submitData);
    } catch (error) {
      // Error handling is done in parent component
      console.error('Error submitting resource:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 bg-teal-50 rounded-lg border-2 border-teal-300">
      <h3 className="text-xl font-bold mb-4 text-gray-800">
        {isEditing ? 'تعديل المادة' : 'مادة جديدة'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title Field */}
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-1">
            عنوان المادة <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.title
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-primary'
            }`}
            placeholder="أدخل عنوان المادة"
            disabled={submitting}
          />
          {errors.title && (
            <p className="text-red-600 text-sm mt-1">{errors.title}</p>
          )}
        </div>

        {/* Description Field */}
        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-1">
            وصف المادة (اختياري)
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-vertical ${
              errors.description
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-primary'
            }`}
            placeholder="أدخل وصف المادة"
            rows={3}
            disabled={submitting}
          />
          {errors.description && (
            <p className="text-red-600 text-sm mt-1">{errors.description}</p>
          )}
        </div>

        {/* URL Field */}
        <div>
          <label htmlFor="url" className="block text-sm font-semibold text-gray-700 mb-1">
            رابط المادة <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.url
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-primary'
            }`}
            placeholder="https://example.com/resource"
            dir="ltr"
            disabled={submitting}
          />
          {errors.url && (
            <p className="text-red-600 text-sm mt-1">{errors.url}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
            disabled={submitting}
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={submitting}
          >
            {submitting ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'إضافة'}
          </button>
        </div>
      </form>
    </div>
  );
}
