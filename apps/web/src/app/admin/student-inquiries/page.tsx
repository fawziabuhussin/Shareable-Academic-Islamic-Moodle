'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import PageLoading from '@/components/PageLoading';

type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  body: string;
  status: string;
  adminAnswerAr: string | null;
  answeredAt: string | null;
  createdAt: string;
  publishedFaq: { id: string; isVisible: boolean } | null;
};

export default function AdminStudentInquiriesPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Inquiry[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { answer: string; status: string; publish: boolean }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await api.get<Inquiry[]>('/student-inquiries/admin', {
      params: filter ? { status: filter } : undefined,
    });
    setList(data);
    const d: Record<string, { answer: string; status: string; publish: boolean }> = {};
    for (const row of data) {
      d[row.id] = {
        answer: row.adminAnswerAr ?? '',
        status: row.status,
        publish: Boolean(row.publishedFaq?.isVisible),
      };
    }
    setDrafts(d);
  }, [filter]);

  useEffect(() => {
    (async () => {
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const save = async (id: string) => {
    const d = drafts[id];
    if (!d) return;
    setSavingId(id);
    setMsg(null);
    try {
      await api.patch(`/student-inquiries/admin/${id}`, {
        status: d.status,
        adminAnswerAr: d.answer || null,
        publishToFaq: d.publish,
      });
      setMsg('تم التحديث');
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'فشل الحفظ');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-[#1a3a2f] mb-6">استفسارات الطلاب (العامة)</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setFilter('')}
          className={`px-3 py-1.5 rounded-lg text-sm ${filter === '' ? 'bg-[#1a3a2f] text-white' : 'bg-stone-200'}`}
        >
          الكل
        </button>
        {['NEW', 'ANSWERED', 'ARCHIVED'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm ${filter === s ? 'bg-[#1a3a2f] text-white' : 'bg-stone-200'}`}
          >
            {s === 'NEW' ? 'جديد' : s === 'ANSWERED' ? 'مُجاب' : 'مؤرشف'}
          </button>
        ))}
      </div>

      {msg && <div className="mb-4 text-sm text-stone-700 bg-stone-100 px-3 py-2 rounded-lg">{msg}</div>}

      <div className="space-y-3">
        {list.map((row) => {
          const open = expanded === row.id;
          const d = drafts[row.id] ?? { answer: '', status: row.status, publish: false };
          return (
            <div key={row.id} className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-right hover:bg-stone-50"
                onClick={() => setExpanded(open ? null : row.id)}
              >
                <div>
                  <p className="font-semibold text-[#1a3a2f]">{row.subject}</p>
                  <p className="text-xs text-stone-500">
                    {row.name} — {row.email} — {new Date(row.createdAt).toLocaleString('ar')}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    row.status === 'NEW' ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {row.status}
                </span>
              </button>
              {open && (
                <div className="border-t border-stone-100 px-4 py-4 space-y-4 bg-stone-50/50">
                  <div>
                    <p className="text-sm font-medium text-stone-600 mb-1">النص</p>
                    <p className="text-stone-800 whitespace-pre-wrap leading-relaxed">{row.body}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">حالة</label>
                    <select
                      className="rounded-lg border border-stone-300 px-3 py-2"
                      value={d.status}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.id]: { ...d, status: e.target.value },
                        }))
                      }
                    >
                      <option value="NEW">NEW</option>
                      <option value="ANSWERED">ANSWERED</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">إجابة الإدارة</label>
                    <textarea
                      rows={5}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2"
                      value={d.answer}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.id]: { ...d, answer: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={d.publish}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.id]: { ...d, publish: e.target.checked },
                        }))
                      }
                    />
                    <span className="text-sm">نشر السؤال والجواب في أسفل صفحة الاستفسارات العامة</span>
                  </label>
                  <button
                    type="button"
                    disabled={savingId === row.id}
                    onClick={() => save(row.id)}
                    className="rounded-lg bg-[#c9a227] text-white px-5 py-2 font-semibold disabled:opacity-50"
                  >
                    {savingId === row.id ? '…' : 'حفظ'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {list.length === 0 && <p className="text-stone-500 text-center py-12">لا توجد عناصر</p>}
      </div>
    </div>
  );
}
