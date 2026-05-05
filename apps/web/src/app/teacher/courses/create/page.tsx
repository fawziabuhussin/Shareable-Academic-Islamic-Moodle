'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { toDirectImageUrl } from '@/lib/utils';
import { showSuccess, showError, showWarning } from '@/lib/toast';
import { PlusIcon } from '@/components/Icons';

interface Category {
  id: string;
  title: string;
}

export default function TeacherCreateCoursePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryIdParam = searchParams.get('categoryId');
  const [loading, setLoading] = useState(false);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    coverImage: '',
    categoryId: '',
    price: 0,
    status: 'DRAFT' as 'DRAFT' | 'PUBLISHED',
    lifecycle: 'DEFAULT' as 'DEFAULT' | 'ONGOING',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [playlistUrl, setPlaylistUrl] = useState('');

  useEffect(() => {
    loadCategories();
  }, [categoryIdParam]);

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories');
      const categoryList = response.data || [];
      setCategories(categoryList);
      setFormData((prev) => {
        const hasSelection = !!prev.categoryId && prev.categoryId.trim() !== '';
        const matchedCategory = categoryIdParam
          ? categoryList.find((cat: Category) => cat.id === categoryIdParam)
          : null;

        if (matchedCategory) {
          return { ...prev, categoryId: matchedCategory.id };
        }

        if (!hasSelection && categoryList.length > 0) {
          return { ...prev, categoryId: categoryList[0].id };
        }

        return prev;
      });
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const extractPlaylistId = (url: string) => {
    const patterns = [
      /[?&]list=([^#&?]*)/,
      /\/playlist\?list=([^#&?]*)/,
      /list=([^#&?]*)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const handleCreateFromPlaylist = async () => {
    if (!playlistUrl.trim()) {
      showWarning('يرجى إدخال رابط قائمة التشغيل');
      return;
    }

    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
      showWarning('رابط قائمة التشغيل غير صحيح');
      return;
    }

    setLoadingPlaylist(true);

    try {
      const response = await api.post('/playlists/create-course', {
        playlistUrl: playlistUrl.trim(),
        courseTitle: formData.title.trim(),
        courseDescription: formData.description.trim() || `دورة من قائمة تشغيل YouTube`,
        categoryId: formData.categoryId,
        coverImage: formData.coverImage && formData.coverImage.trim() ? formData.coverImage.trim() : undefined,
        price: formData.price || 0,
        status: formData.status,
      });

      const videosCount = response.data.videosCount || response.data.lessons?.length || 0;
      if (videosCount > 0) {
        showSuccess(`تم إنشاء الدورة بنجاح مع ${videosCount} درس من قائمة التشغيل!`);
      } else {
        showSuccess('تم إنشاء الدورة من قائمة التشغيل.');
      }
      router.push(`/teacher/courses/${response.data.course.id}/edit`);
    } catch (error: any) {
      console.error('Failed to create course from playlist:', error);
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map((e: any) => e.message).join('، ');
        showError(`أخطاء: ${errorMessages}`);
      } else {
        showError(error.response?.data?.message || 'فشل إنشاء الدورة من قائمة التشغيل');
      }
    } finally {
      setLoadingPlaylist(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!formData.title.trim()) {
      setErrors({ title: 'العنوان مطلوب' });
      return;
    }
    if (!formData.description.trim()) {
      setErrors({ description: 'الوصف مطلوب' });
      return;
    }
    if (!formData.categoryId) {
      setErrors({ categoryId: 'يجب اختيار الفئة' });
      return;
    }

    // If a playlist URL is provided, create from playlist
    if (playlistUrl.trim()) {
      const playlistId = extractPlaylistId(playlistUrl);
      if (!playlistId) {
        showWarning('رابط قائمة التشغيل غير صحيح');
        return;
      }
      await handleCreateFromPlaylist();
      return;
    }

    setLoading(true);

    try {
      const courseData: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId,
        price: formData.price || 0,
        status: formData.status,
        lifecycle: formData.lifecycle,
      };

      if (formData.coverImage && formData.coverImage.trim()) {
        try {
          new URL(formData.coverImage.trim());
          courseData.coverImage = formData.coverImage.trim();
        } catch {}
      }

      const response = await api.post('/courses', courseData);
      showSuccess('تم إنشاء الدورة بنجاح!');
      router.push(`/teacher/courses/${response.data.id}/edit`);
    } catch (error: any) {
      console.error('Failed to create course:', error);
      if (error.response?.data?.errors) {
        const errorMap: { [key: string]: string } = {};
        error.response.data.errors.forEach((err: any) => {
          errorMap[err.path[0]] = err.message;
        });
        setErrors(errorMap);
      } else {
        showError(error.response?.data?.message || 'فشل إنشاء الدورة');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <PlusIcon className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold">إنشاء دورة جديدة</h1>
              <p className="text-white/70 text-sm">إضافة دورة جديدة</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 text-stone-800">إنشاء دورة جديدة</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-stone-700">عنوان الدورة</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (errors.title) setErrors({ ...errors, title: '' });
                }}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#1a3a2f] text-stone-800 ${
                  errors.title ? 'border-red-500' : 'border-stone-200'
                }`}
                placeholder="مثال: مبادئ الفقه الإسلامي"
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-stone-700">وصف الدورة</label>
              <textarea
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (errors.description) setErrors({ ...errors, description: '' });
                }}
                required
                rows={5}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#1a3a2f] text-stone-800 ${
                  errors.description ? 'border-red-500' : 'border-stone-200'
                }`}
                placeholder="اكتب وصفاً شاملاً للدورة..."
              />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium mb-2 text-stone-700">الفئة</label>
                <button
                  type="button"
                  onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                  className={`w-full px-4 py-3 border rounded-lg bg-white text-stone-800 text-right flex items-center justify-between ${
                    errors.categoryId ? 'border-red-500' : 'border-stone-200'
                  }`}
                >
                  <span>
                    {formData.categoryId 
                      ? categories.find(c => c.id === formData.categoryId)?.title || 'اختر الفئة'
                      : 'اختر الفئة'
                    }
                  </span>
                  <svg className={`w-5 h-5 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {categoryDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setCategoryDropdownOpen(false)} />
                    <div className="absolute z-20 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, categoryId: cat.id });
                            if (errors.categoryId) setErrors({ ...errors, categoryId: '' });
                            setCategoryDropdownOpen(false);
                          }}
                          className={`w-full text-right px-4 py-3 hover:bg-stone-50 ${
                            formData.categoryId === cat.id ? 'bg-[#1a3a2f] text-white' : 'text-stone-800'
                          }`}
                        >
                          {cat.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-stone-700">السعر (ر.س)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f] text-stone-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-stone-700">رابط الصورة (اختياري)</label>
              <input
                type="url"
                value={formData.coverImage}
                onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f] text-stone-800"
                placeholder="https://example.com/image.jpg"
              />
              {formData.coverImage && (
                <div className="mt-3">
                  <img
                    src={toDirectImageUrl(formData.coverImage) || formData.coverImage}
                    alt="Preview"
                    className="w-full max-w-md h-40 object-cover rounded-lg border border-stone-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="relative">
              <label className="block text-sm font-medium mb-2 text-stone-700">الحالة</label>
              <button
                type="button"
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className="w-full px-4 py-3 border border-stone-200 rounded-lg bg-white text-stone-800 text-right flex items-center justify-between"
              >
                <span>{formData.status === 'DRAFT' ? 'مسودة' : 'منشور'}</span>
                <svg className={`w-5 h-5 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {statusDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownOpen(false)} />
                  <div className="absolute z-20 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg">
                    {[
                      { value: 'DRAFT', label: 'مسودة' },
                      { value: 'PUBLISHED', label: 'منشور' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, status: option.value as any });
                          setStatusDropdownOpen(false);
                        }}
                        className={`w-full text-right px-4 py-3 hover:bg-stone-50 ${
                          formData.status === option.value ? 'bg-[#1a3a2f] text-white' : 'text-stone-800'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Ongoing toggle */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.lifecycle === 'ONGOING'}
                  onChange={(e) => setFormData({ ...formData, lifecycle: e.target.checked ? 'ONGOING' : 'DEFAULT' })}
                  className="w-5 h-5 rounded border-stone-300 text-[#1a3a2f] focus:ring-[#1a3a2f]"
                />
                <div>
                  <span className="text-sm font-medium text-stone-700">دورة وجاهيّة</span>
                  <p className="text-xs text-stone-500">الدروس تُضاف تدريجياً فور تسجيلها</p>
                </div>
              </label>
            </div>

            {/* YouTube Playlist (optional) */}
            <div>
              <label className="block text-sm font-medium mb-2 text-stone-700">رابط قائمة تشغيل YouTube (اختياري)</label>
              <input
                type="url"
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f] text-stone-800"
                placeholder="https://www.youtube.com/watch?v=...&list=..."
              />
              <p className="text-xs text-stone-500 mt-2">
                في حال إدخال رابط قائمة تشغيل، سيتم إنشاء دروس الدورة تلقائياً من الفيديوهات
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={loading || loadingPlaylist}
              className="flex-1 px-6 py-3 bg-[#1a3a2f] text-white rounded-lg font-medium hover:bg-[#2d5a4a] transition disabled:opacity-50"
            >
              {loading || loadingPlaylist ? 'جاري الإنشاء...' : 'إنشاء الدورة'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
