'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import PageLoading from '@/components/PageLoading';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useConfirmDialog } from '@/lib/useConfirmDialog';

type Entry = {
  id: string;
  questionAr: string;
  answerAr: string;
  sortOrder: number;
  isVisible: boolean;
  sourceInquiryId: string | null;
};

export default function AdminPublicFaqPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Entry[]>([]);
  const [creating, setCreating] = useState(false);
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const {
    confirm,
    isOpen: confirmOpen,
    options: confirmOptions,
    handleConfirm,
    handleClose: handleConfirmClose,
  } = useConfirmDialog();

  const load = useCallback(async () => {
    const { data } = await api.get<Entry[]>('/public-faq/admin/all');
    setList(data);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const add = async () => {
    setErr(null);
    if (!newQ.trim() || !newA.trim()) {
      setErr('أدخل السؤال والجواب');
      return;
    }
    setCreating(true);
    try {
      await api.post('/public-faq/admin', { questionAr: newQ, answerAr: newA });
      setNewQ('');
      setNewA('');
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'فشل الإنشاء');
    } finally {
      setCreating(false);
    }
  };

  const patch = async (id: string, patch: Partial<Entry>) => {
    await api.put(`/public-faq/admin/${id}`, patch);
    await load();
  };

  const remove = async (id: string) => {
    const ok = await confirm({
      message: 'حذف هذا السؤال؟ لا يمكن التراجع.',
      variant: 'danger',
      confirmText: 'حذف',
      cancelText: 'إلغاء',
    });
    if (!ok) return;
    await api.delete(`/public-faq/admin/${id}`);
    await load();
  };

  if (loading) return <PageLoading />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-[#1a3a2f] mb-2">الأسئلة الشائعة العامة</h1>
      <p className="text-stone-600 text-sm mb-8">تظهر في أسفل صفحة «استفسارات» للزوار عند تفعيل الإظهار.</p>

      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm mb-8 space-y-3">
        <h2 className="font-semibold text-[#1a3a2f]">إضافة سؤال يدوي</h2>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <input
          className="w-full rounded-lg border border-stone-300 px-3 py-2"
          placeholder="السؤال"
          value={newQ}
          onChange={(e) => setNewQ(e.target.value)}
        />
        <textarea
          rows={4}
          className="w-full rounded-lg border border-stone-300 px-3 py-2"
          placeholder="الجواب"
          value={newA}
          onChange={(e) => setNewA(e.target.value)}
        />
        <button
          type="button"
          disabled={creating}
          onClick={add}
          className="rounded-lg bg-[#1a3a2f] text-white px-5 py-2 font-semibold disabled:opacity-50"
        >
          إضافة
        </button>
      </div>

      <div className="space-y-3">
        {list.map((row) => (
          <div key={row.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-stone-500">ترتيب: {row.sortOrder}</span>
              {row.sourceInquiryId && (
                <span className="text-xs bg-amber-50 text-amber-900 px-2 py-0.5 rounded">من استفسار طالب</span>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={row.isVisible}
                  onChange={(e) => patch(row.id, { isVisible: e.target.checked })}
                />
                ظاهر للعامة
              </label>
            </div>
            <FaqEditorRow row={row} onSave={(p) => patch(row.id, p)} onDelete={() => remove(row.id)} />
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={handleConfirmClose}
        onConfirm={handleConfirm}
        {...confirmOptions}
      />
    </div>
  );
}

function FaqEditorRow({
  row,
  onSave,
  onDelete,
}: {
  row: Entry;
  onSave: (p: Partial<Entry>) => void;
  onDelete: () => void;
}) {
  const [q, setQ] = useState(row.questionAr);
  const [a, setA] = useState(row.answerAr);
  const [order, setOrder] = useState(row.sortOrder);

  return (
    <>
      <input className="w-full rounded-lg border border-stone-300 px-3 py-2 font-medium" value={q} onChange={(e) => setQ(e.target.value)} />
      <textarea className="w-full rounded-lg border border-stone-300 px-3 py-2" rows={4} value={a} onChange={(e) => setA(e.target.value)} />
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-sm flex items-center gap-1">
          ترتيب
          <input
            type="number"
            className="w-20 rounded border border-stone-300 px-2 py-1"
            value={order}
            onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)}
          />
        </label>
        <button
          type="button"
          onClick={() => onSave({ questionAr: q, answerAr: a, sortOrder: order })}
          className="rounded-lg bg-[#c9a227] text-white px-4 py-1.5 text-sm font-semibold"
        >
          حفظ التعديلات
        </button>
        <button type="button" onClick={onDelete} className="text-red-600 text-sm hover:underline mr-auto">
          حذف
        </button>
      </div>
    </>
  );
}
