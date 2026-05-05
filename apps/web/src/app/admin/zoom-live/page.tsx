'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import PageLoading from '@/components/PageLoading';

type WeeklyWindow = { dayOfWeek: number; start: string; end: string };

type Settings = {
  zoomUrl: string;
  timezone: string;
  weeklySchedule: WeeklyWindow[];
  manualOverride: string;
  showButton: boolean;
  nextSessionMessageAr: string | null;
  buttonLabelAr: string;
};

const DAY_LABELS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function AdminZoomLivePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState<Settings | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<Settings>('/zoom-live/admin/settings');
        setForm({
          ...data,
          weeklySchedule: Array.isArray(data.weeklySchedule) ? data.weeklySchedule : [],
        });
      } catch {
        setErr('تعذر تحميل الإعدادات');
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
      const { data } = await api.put<Settings>('/zoom-live/admin/settings', {
        zoomUrl: form.zoomUrl,
        timezone: form.timezone,
        weeklySchedule: form.weeklySchedule,
        manualOverride: form.manualOverride,
        showButton: form.showButton,
        nextSessionMessageAr: form.nextSessionMessageAr,
        buttonLabelAr: form.buttonLabelAr,
      });
      setForm({
        ...data,
        weeklySchedule: Array.isArray(data.weeklySchedule) ? data.weeklySchedule : [],
      });
      setOk('تم الحفظ');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const addWindow = () => {
    if (!form) return;
    setForm({
      ...form,
      weeklySchedule: [...form.weeklySchedule, { dayOfWeek: 0, start: '18:00', end: '21:00' }],
    });
  };

  const updateWindow = (i: number, patch: Partial<WeeklyWindow>) => {
    if (!form) return;
    const next = [...form.weeklySchedule];
    next[i] = { ...next[i], ...patch };
    setForm({ ...form, weeklySchedule: next });
  };

  const removeWindow = (i: number) => {
    if (!form) return;
    setForm({ ...form, weeklySchedule: form.weeklySchedule.filter((_, j) => j !== i) });
  };

  if (loading || !form) {
    return <PageLoading />;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-[#1a3a2f] mb-2">بث زووم مباشر — الشريط العلوي</h1>
      <p className="text-stone-600 text-sm mb-8">
        يظهر زر البث لجميع الزوار في الموقع العام. حالة «مباشر» تُحسب من الجدولة أدناه (توقيت القدس/إسرائيل افتراضياً)
        مع إمكانية التحكم اليدوي.
      </p>

      {err && <div className="mb-4 rounded-lg bg-red-50 text-red-800 px-4 py-2 text-sm">{err}</div>}
      {ok && <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-800 px-4 py-2 text-sm">{ok}</div>}

      <div className="space-y-6 bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.showButton}
            onChange={(e) => setForm({ ...form, showButton: e.target.checked })}
          />
          <span className="font-medium">إظهار زر البث في الترويسة</span>
        </label>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">رابط الانضمام إلى الزووم (https)</label>
          <input
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-left"
            dir="ltr"
            value={form.zoomUrl}
            onChange={(e) => setForm({ ...form, zoomUrl: e.target.value })}
            placeholder="https://zoom.us/j/..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">المنطقة الزمنية (IANA)</label>
          <input
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-left"
            dir="ltr"
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            placeholder="Asia/Jerusalem"
          />
          <p className="text-xs text-stone-500 mt-1">مثال: Asia/Jerusalem لتوقيت القدس.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">وضع يدوي</label>
          <select
            className="w-full rounded-lg border border-stone-300 px-3 py-2"
            value={form.manualOverride}
            onChange={(e) => setForm({ ...form, manualOverride: e.target.value })}
          >
            <option value="AUTO">تلقائي حسب الجدول</option>
            <option value="FORCE_LIVE">فرض وضع مباشر (يظهر Live ويفتح الرابط)</option>
            <option value="FORCE_OFF">فرض غير مباشر (حتى داخل أوقات الجدول)</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-stone-700">نوافذ البث الأسبوعية</label>
            <button type="button" onClick={addWindow} className="text-sm text-[#c9a227] font-semibold hover:underline">
              + إضافة فترة
            </button>
          </div>
          <p className="text-xs text-stone-500 mb-3">0 = الأحد، 6 = السبت. الصيغة HH:mm (24 ساعة).</p>
          <div className="space-y-3">
            {form.weeklySchedule.map((w, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-center p-3 rounded-lg bg-stone-50 border border-stone-200">
                <select
                  value={w.dayOfWeek}
                  onChange={(e) => updateWindow(i, { dayOfWeek: parseInt(e.target.value, 10) })}
                  className="rounded border border-stone-300 px-2 py-1.5"
                >
                  {DAY_LABELS.map((d, di) => (
                    <option key={di} value={di}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={w.start}
                  onChange={(e) => updateWindow(i, { start: e.target.value })}
                  className="rounded border border-stone-300 px-2 py-1.5"
                />
                <span className="text-stone-500">إلى</span>
                <input
                  type="time"
                  value={w.end}
                  onChange={(e) => updateWindow(i, { end: e.target.value })}
                  className="rounded border border-stone-300 px-2 py-1.5"
                />
                <button
                  type="button"
                  onClick={() => removeWindow(i)}
                  className="text-red-600 text-sm mr-auto hover:underline"
                >
                  حذف
                </button>
              </div>
            ))}
            {form.weeklySchedule.length === 0 && (
              <p className="text-stone-500 text-sm">لا توجد فترات — لن يُعتبر البث «مباشراً» في الوضع التلقائي.</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">نص الزر في الترويسة</label>
          <input
            className="w-full rounded-lg border border-stone-300 px-3 py-2"
            value={form.buttonLabelAr}
            onChange={(e) => setForm({ ...form, buttonLabelAr: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">رسالة عند عدم كون البث مباشراً (نافذة منبثقة)</label>
          <textarea
            rows={4}
            className="w-full rounded-lg border border-stone-300 px-3 py-2"
            value={form.nextSessionMessageAr ?? ''}
            onChange={(e) => setForm({ ...form, nextSessionMessageAr: e.target.value || null })}
          />
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-[#1a3a2f] text-white px-6 py-2.5 font-semibold hover:bg-[#143028] disabled:opacity-50"
        >
          {saving ? 'جاري الحفظ…' : 'حفظ'}
        </button>
      </div>
    </div>
  );
}
