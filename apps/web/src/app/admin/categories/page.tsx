'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { FolderIcon, PlusIcon, EditIcon, TrashIcon, BookIcon } from '@/components/Icons';
import { showSuccess, showError, TOAST_MESSAGES } from '@/lib/toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useConfirmDialog } from '@/lib/useConfirmDialog';
import PageLoading from '@/components/PageLoading';

interface Category {
  id: string;
  title: string;
  description?: string;
  order: number;
  _count: { courses: number };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', order: 0 });
  const { confirm, isOpen: confirmOpen, options: confirmOptions, handleConfirm, handleClose: handleConfirmClose } = useConfirmDialog();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, formData);
        showSuccess(TOAST_MESSAGES.UPDATE_SUCCESS);
      } else {
        await api.post('/categories', formData);
        showSuccess(TOAST_MESSAGES.CREATE_SUCCESS);
      }
      setShowForm(false);
      setEditingCategory(null);
      setFormData({ title: '', description: '', order: 0 });
      loadCategories();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل حفظ الفئة');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      title: category.title,
      description: category.description || '',
      order: category.order,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ message: 'هل أنت متأكد من حذف هذه الفئة؟', title: 'حذف الفئة', variant: 'danger' });
    if (!ok) return;

    try {
      await api.delete(`/categories/${id}`);
      showSuccess(TOAST_MESSAGES.DELETE_SUCCESS);
      loadCategories();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل حذف الفئة');
    }
  };

  const totalCourses = categories.reduce((sum, c) => sum + (c._count?.courses || 0), 0);

  if (loading && categories.length === 0) {
    return <PageLoading title="التصنيفات" icon={<FolderIcon size={24} />} />;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <FolderIcon size={24} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">إدارة الفئات</h1>
                <p className="text-white/70 text-sm">{categories.length} فئة</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingCategory(null);
                setFormData({ title: '', description: '', order: 0 });
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#c9a227] text-white rounded-xl font-bold hover:bg-[#b08f20] transition-all shadow-lg"
            >
              <PlusIcon size={18} />
              فئة جديدة
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <p className="text-2xl font-bold text-[#1a3a2f]">{categories.length}</p>
            <p className="text-sm text-stone-500">إجمالي الفئات</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <p className="text-2xl font-bold text-sky-600">{totalCourses}</p>
            <p className="text-sm text-stone-500">إجمالي الدورات</p>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6 mb-6">
            <h2 className="text-lg font-bold mb-4 text-stone-800">{editingCategory ? 'تعديل الفئة' : 'إضافة فئة جديدة'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-stone-700">العنوان</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] text-stone-800 bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-stone-700">الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] text-stone-800 bg-white transition-all"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-stone-700">الترتيب</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] text-stone-800 bg-white transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#1a3a2f] text-white rounded-lg font-medium hover:bg-[#143026] transition"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingCategory(null);
                  }}
                  className="px-5 py-2.5 bg-stone-100 text-stone-700 rounded-lg font-medium hover:bg-stone-200 transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Categories List */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
          {categories.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderIcon size={32} className="text-stone-400" />
              </div>
              <p className="text-stone-500 text-lg mb-4">لا توجد فئات</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a3a2f] text-white rounded-xl font-bold hover:bg-[#143026] transition"
              >
                <PlusIcon size={18} />
                إضافة فئة جديدة
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">الفئة</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider hidden sm:table-cell">الترتيب</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">عدد الدورات</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <h3 className="font-semibold text-stone-800">{category.title}</h3>
                          {category.description && (
                            <p className="text-sm text-stone-500 line-clamp-1">{category.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-stone-600 hidden sm:table-cell">{category.order}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-stone-600">
                          <BookIcon size={14} />
                          <span className="text-sm font-medium">{category._count?.courses || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link
                            href={`/admin/courses/create?categoryId=${category.id}`}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition text-sm font-medium"
                          >
                            إضافة دورة
                          </Link>
                          <Link
                            href={`/admin/courses?categoryId=${category.id}`}
                            className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition text-sm font-medium"
                          >
                            عرض الدورات
                          </Link>
                          <button
                            onClick={() => handleEdit(category)}
                            className="px-3 py-1.5 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100 transition text-sm font-medium"
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
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
      </div>
      <ConfirmDialog isOpen={confirmOpen} onClose={handleConfirmClose} onConfirm={handleConfirm} {...confirmOptions} />
    </div>
  );
}

