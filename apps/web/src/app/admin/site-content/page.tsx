'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import PageLoading from '@/components/PageLoading';

type Row = {
  registrationUrl: string;
  youtubeUrl: string;
  mapsInfoUrl: string | null;
};

export default function AdminSiteContentPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState<Row | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<Row>('/site-content/admin/settings');
        setForm(data);
      } catch {
        setErr('تعذر التحميل');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      const { data } = await api.put<Row>('/site-content/admin/settings', {
        registrationUrl: form.registrationUrl,
        youtubeUrl: form.youtubeUrl,
        mapsInfoUrl: form.mapsInfoUrl || '',
      });
      setForm(data);
      setOk('تم الحفظ');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) return <PageLoading />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-[#1a3a2f] mb-2">روابط الصفحات العامة</h1>
      <p className="text-stone-600 text-sm mb-8">تُستخدم في صفحة الاستفسارات وأزرار الدعوة للعمل.</p>

      {err && <div className="mb-4 rounded-lg bg-red-50 text-red-800 px-4 py-2 text-sm">{err}</div>}
      {ok && <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-800 px-4 py-2 text-sm">{ok}</div>}

      <div className="space-y-4 bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium mb-1">رابط التسجيل</label>
          <input
            dir="ltr"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-left"
            value={form.registrationUrl}
            onChange={(e) => setForm({ ...form, registrationUrl: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">رابط قناة اليوتيوب</label>
          <input
            dir="ltr"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-left"
            value={form.youtubeUrl}
            onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">رابط خريطة / الوصول (اختياري)</label>
          <input
            dir="ltr"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-left"
            value={form.mapsInfoUrl ?? ''}
            onChange={(e) => setForm({ ...form, mapsInfoUrl: e.target.value || null })}
            placeholder="https://maps.google.com/..."
          />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-[#1a3a2f] text-white px-6 py-2.5 font-semibold disabled:opacity-50"
        >
          {saving ? '…' : 'حفظ'}
        </button>
      </div>
    </div>
  );
}
