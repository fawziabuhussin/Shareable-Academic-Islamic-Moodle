'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { StarIcon, PlusIcon, EditIcon, TrashIcon } from '@/components/Icons';
import { showSuccess, showError, TOAST_MESSAGES } from '@/lib/toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useConfirmDialog } from '@/lib/useConfirmDialog';
import PageLoading from '@/components/PageLoading';

interface Promotion {
  id: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  linkUrlMale: string | null;
  linkLabelMale: string | null;
  linkUrlFemale: string | null;
  linkLabelFemale: string | null;
  zoomUrl: string | null;
  youtubeUrl: string | null;
  active: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
}

function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm = {
  title: '',
  body: '',
  imageUrl: '',
  linkUrl: '',
  linkLabel: '',
  linkUrlMale: '',
  linkLabelMale: '',
  linkUrlFemale: '',
  linkLabelFemale: '',
  zoomUrl: '',
  youtubeUrl: '',
  active: true,
  sortOrder: 0,
  startsAt: '',
  endsAt: '',
};

export default function AdminHomePromotionsPage() {
  const [rows, setRows] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageUploading, setImageUploading] = useState(false);
  const { confirm, isOpen: confirmOpen, options: confirmOptions, handleConfirm, handleClose: handleConfirmClose } =
    useConfirmDialog();

  useEffect(() => {
    loadRows();
  }, []);

  const loadRows = async () => {
    try {
      const res = await api.get<Promotion[]>('/home-promotions/all');
      setRows(res.data || []);
    } catch (e) {
      console.error(e);
      showError('تعذر تحميل الإعلانات');
    } finally {
      setLoading(false);
    }
  };

  const parseOptionalDate = (v: string): string | null => {
    const t = v.trim();
    if (!t) return null;
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };

  const buildPayload = () => ({
    title: form.title.trim(),
    body: form.body.trim() || null,
    imageUrl: form.imageUrl.trim() || null,
    linkUrl: form.linkUrl.trim() || null,
    linkLabel: form.linkLabel.trim() || null,
    linkUrlMale: form.linkUrlMale.trim() || null,
    linkLabelMale: form.linkLabelMale.trim() || null,
    linkUrlFemale: form.linkUrlFemale.trim() || null,
    linkLabelFemale: form.linkLabelFemale.trim() || null,
    zoomUrl: form.zoomUrl.trim() || null,
    youtubeUrl: form.youtubeUrl.trim() || null,
    active: form.active,
    sortOrder: form.sortOrder,
    startsAt: parseOptionalDate(form.startsAt),
    endsAt: parseOptionalDate(form.endsAt),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = buildPayload();
      if (editing) {
        await api.put(`/home-promotions/${editing.id}`, payload);
        showSuccess(TOAST_MESSAGES.UPDATE_SUCCESS);
      } else {
        await api.post('/home-promotions', payload);
        showSuccess(TOAST_MESSAGES.CREATE_SUCCESS);
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      loadRows();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message;
      showError(msg || 'فشل الحفظ');
    }
  };

  const openEdit = (p: Promotion) => {
    setEditing(p);
    setForm({
      title: p.title,
      body: p.body || '',
      imageUrl: p.imageUrl || '',
      linkUrl: p.linkUrl || '',
      linkLabel: p.linkLabel || '',
      linkUrlMale: p.linkUrlMale || '',
      linkLabelMale: p.linkLabelMale || '',
      linkUrlFemale: p.linkUrlFemale || '',
      linkLabelFemale: p.linkLabelFemale || '',
      zoomUrl: p.zoomUrl || '',
      youtubeUrl: p.youtubeUrl || '',
      active: p.active,
      sortOrder: p.sortOrder,
      startsAt: isoToDatetimeLocal(p.startsAt),
      endsAt: isoToDatetimeLocal(p.endsAt),
    });
    setShowForm(true);
  };

  const handlePromotionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageUploading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

      // Prefer Next.js route: server-side `put()` with BLOB_READ_WRITE_TOKEN on the **web** Vercel project.
      let url: string | undefined;
      if (token) {
        const fdLocal = new FormData();
        fdLocal.append('file', file);
        const localRes = await fetch('/api/admin/promotion-image', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fdLocal,
        });
        if (localRes.ok) {
          const data = (await localRes.json()) as { url?: string };
          url = data?.url;
        } else if (localRes.status !== 501) {
          const errBody = (await localRes.json().catch(() => ({}))) as { message?: string };
          throw new Error(errBody.message || 'فشل رفع الصورة');
        }
      }

      if (!url) {
        const fdApi = new FormData();
        fdApi.append('file', file);
        const res = await api.post<{ url: string }>('/home-promotions/upload-image', fdApi);
        url = res.data?.url;
      }

      if (url) {
        setForm((prev) => ({ ...prev, imageUrl: url }));
        showSuccess('تم رفع الصورة');
      }
    } catch (err: any) {
      showError(err.response?.data?.message || err.message || 'فشل رفع الصورة');
    } finally {
      setImageUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      message: 'حذف هذا الإعلان من الصفحة الرئيسية؟',
      title: 'تأكيد الحذف',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/home-promotions/${id}`);
      showSuccess(TOAST_MESSAGES.DELETE_SUCCESS);
      loadRows();
    } catch (err: any) {
      showError(err.response?.data?.message || 'فشل الحذف');
    }
  };

  if (loading && rows.length === 0) {
    return <PageLoading title="إعلانات الصفحة الرئيسية" icon={<StarIcon size={24} />} />;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <StarIcon size={24} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">إعلانات الصفحة الرئيسية</h1>
                <p className="text-white/70 text-sm">
                  تظهر بعد تسجيل الدخول في الصفحة الرئيسية ولوحة الطالب؛ الروابط تُفلتر حسب الجنس (MALE/FEMALE) من
                  الملف الشخصي
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(emptyForm);
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#c9a227] text-white rounded-xl font-bold hover:bg-[#b08f20] transition-all shadow-lg"
            >
              <PlusIcon size={18} />
              إعلان جديد
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6 mb-6">
            <h2 className="text-lg font-bold mb-4 text-stone-800">{editing ? 'تعديل الإعلان' : 'إعلان جديد'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-stone-700">العنوان</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-stone-700">النص (اختياري)</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-stone-700">صورة الإعلان (اختياري)</label>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <label className="inline-flex items-center justify-center px-4 py-2.5 bg-[#1a3a2f] text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-[#143026] disabled:opacity-50 shrink-0">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      disabled={imageUploading}
                      onChange={handlePromotionImageUpload}
                    />
                    {imageUploading ? 'جاري الرفع…' : 'رفع صورة من الجهاز'}
                  </label>
                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="أو الصق رابط https://..."
                    className="flex-1 min-w-0 px-4 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f]"
                  />
                </div>
                <p className="text-xs text-stone-500 mt-1.5">
                  على Vercel: أضف <code className="text-stone-700 bg-stone-100 px-1 rounded">BLOB_READ_WRITE_TOKEN</code> من
                  Storage → Blob إلى مشروع <strong>الويب</strong> (يُستخدم تلقائياً مع هذا الزر) أو إلى مشروع{' '}
                  <strong>الـ API</strong> لرفع الملف عبر الخادم. لا تضع الرمز في المتصفح — الرفع يتم عبر الخادم فقط.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-stone-700">رابط الزر (اختياري)</label>
                <input
                  type="text"
                  value={form.linkUrl}
                  onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                  placeholder="/courses أو https://..."
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-stone-700">نص الزر (اختياري)</label>
                <input
                  type="text"
                  value={form.linkLabel}
                  onChange={(e) => setForm({ ...form, linkLabel: e.target.value })}
                  placeholder="سجّل الآن"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f]"
                />
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-4 space-y-4">
                <p className="text-sm font-semibold text-[#1a3a2f]">Zoom و YouTube (اختياري)</p>
                <p className="text-xs text-stone-600 leading-relaxed">
                  تُعرض أيقونات بجانب الإعلان للطلاب. يجب أن تبدأ الروابط بـ <strong>https://</strong> (مثال Zoom:
                  رابط الاجتماع، YouTube: قناة أو فيديو أو قائمة).
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">رابط Zoom</label>
                    <input
                      type="url"
                      value={form.zoomUrl}
                      onChange={(e) => setForm({ ...form, zoomUrl: e.target.value })}
                      placeholder="https://zoom.us/j/..."
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">رابط YouTube</label>
                    <input
                      type="url"
                      value={form.youtubeUrl}
                      onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                      placeholder="https://www.youtube.com/..."
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f]"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-4 space-y-4">
                <p className="text-sm font-semibold text-[#1a3a2f]">روابط حسب الجنس (اختياري)</p>
                <p className="text-xs text-stone-600 leading-relaxed">
                  عند تحديد جنس الطالب (MALE/FEMALE) يُعرض رابط واحد فقط حسب الجنس، مع الرجوع للرابط العام عند
                  الحاجة. بدون جنس وبدون رابط عام لا يُعرض زر إن وُجد رابطان مخصصان فقط.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-stone-700">رابط الطلاب (MALE)</label>
                    <input
                      type="text"
                      value={form.linkUrlMale}
                      onChange={(e) => setForm({ ...form, linkUrlMale: e.target.value })}
                      placeholder="/path أو https://..."
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f]"
                    />
                    <input
                      type="text"
                      value={form.linkLabelMale}
                      onChange={(e) => setForm({ ...form, linkLabelMale: e.target.value })}
                      placeholder="نص الزر — مثال: للطلاب"
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-stone-700">رابط الطالبات (FEMALE)</label>
                    <input
                      type="text"
                      value={form.linkUrlFemale}
                      onChange={(e) => setForm({ ...form, linkUrlFemale: e.target.value })}
                      placeholder="/path أو https://..."
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f]"
                    />
                    <input
                      type="text"
                      value={form.linkLabelFemale}
                      onChange={(e) => setForm({ ...form, linkLabelFemale: e.target.value })}
                      placeholder="نص الزر — مثال: للطالبات"
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-stone-700">الترتيب (الأصغر يظهر أولاً)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      className="rounded border-stone-300"
                    />
                    <span className="text-sm font-medium text-stone-700">نشط</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-stone-700">بداية العرض (اختياري)</label>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-stone-700">نهاية العرض (اختياري)</label>
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="px-5 py-2.5 bg-[#1a3a2f] text-white rounded-lg font-medium hover:bg-[#143026]">
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                  className="px-5 py-2.5 bg-stone-100 text-stone-700 rounded-lg font-medium hover:bg-stone-200"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
          {rows.length === 0 ? (
            <div className="text-center py-12 text-stone-500">لا توجد إعلانات بعد</div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {rows.map((p) => (
                <li key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                  <div className="min-w-0 text-right flex-1">
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span className="font-bold text-[#1a3a2f]">{p.title}</span>
                      {!p.active ? (
                        <span className="text-xs bg-stone-200 text-stone-600 px-2 py-0.5 rounded">متوقف</span>
                      ) : (
                        <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">نشط</span>
                      )}
                      <span className="text-xs text-stone-400">ترتيب {p.sortOrder}</span>
                      {p.zoomUrl ? (
                        <span className="text-xs bg-[#2D8CFF]/15 text-[#1565bd] px-2 py-0.5 rounded">Zoom</span>
                      ) : null}
                      {p.youtubeUrl ? (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">YouTube</span>
                      ) : null}
                    </div>
                    {p.body ? <p className="text-sm text-stone-600 mt-1 line-clamp-2">{p.body}</p> : null}
                  </div>
                  <div className="flex gap-2 shrink-0 justify-end">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="p-2 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600"
                      aria-label="تعديل"
                    >
                      <EditIcon size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="p-2 rounded-lg border border-red-200 hover:bg-red-50 text-red-600"
                      aria-label="حذف"
                    >
                      <TrashIcon size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={handleConfirmClose}
        onConfirm={handleConfirm}
        title={confirmOptions.title}
        message={confirmOptions.message}
        variant={confirmOptions.variant}
      />
    </div>
  );
}
