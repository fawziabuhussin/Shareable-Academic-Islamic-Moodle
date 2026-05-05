'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, BookOpen, GraduationCap, ClipboardList, MapPin, Car, Send } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

type SiteContent = {
  registrationUrl: string;
  youtubeUrl: string;
  mapsInfoUrl: string | null;
};

type FaqItem = {
  id: string;
  questionAr: string;
  answerAr: string;
  sortOrder: number;
};

const inquirySchema = z.object({
  name: z.string().min(2, 'أدخل الاسم').max(200),
  email: z.string().email('بريد غير صالح'),
  phone: z.string().max(40).optional(),
  subject: z.string().min(2, 'أدخل عنوان الاستفسار').max(300),
  body: z.string().min(10, 'النص قصير جداً').max(8000),
});

type InquiryFormValues = z.infer<typeof inquirySchema>;

function SectionTitle({
  icon: Icon,
  children,
  id,
}: {
  icon?: React.ElementType;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <h2 id={id} className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-[#1a3a2f] mb-4">
      {Icon && <Icon className="w-7 h-7 text-[#c9a227] shrink-0" aria-hidden />}
      {children}
    </h2>
  );
}

function HighlightCard({
  variant = 'default',
  children,
}: {
  variant?: 'default' | 'amber' | 'rose';
  children: React.ReactNode;
}) {
  const styles =
    variant === 'amber'
      ? 'border-[#c9a227]/40 bg-gradient-to-br from-amber-50/90 to-white'
      : variant === 'rose'
        ? 'border-rose-200 bg-gradient-to-br from-rose-50/80 to-white'
        : 'border-emerald-200/60 bg-white';
  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 shadow-sm ${styles}`}
    >
      {children}
    </div>
  );
}

export default function InquiriesPage() {
  const { data: site } = useSWR<SiteContent>('/site-content/public', fetcher);
  const { data: faqList } = useSWR<FaqItem[]>('/public-faq/public', fetcher);

  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState<string | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const registrationUrl = site?.registrationUrl ?? 'https://sites.google.com/view/zad2023/home';
  const youtubeUrl = site?.youtubeUrl ?? 'https://www.youtube.com/@amjadkeadan/playlists';
  const mapsInfoUrl =
    site?.mapsInfoUrl ??
    'https://waze.com/ul/hsvbbms3vh';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InquiryFormValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { name: '', email: '', phone: '', subject: '', body: '' },
  });

  const onSubmit = async (values: InquiryFormValues) => {
    setSubmitOk(null);
    setSubmitErr(null);
    try {
      await api.post('/student-inquiries/submit', {
        ...values,
        phone: values.phone?.trim() || undefined,
      });
      setSubmitOk('تم استلام استفسارك بإذن الله، وسيُنشر الجواب عند تجهيزه ليستفيد الجميع.');
      reset();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (Array.isArray(e?.response?.data?.errors) ? e.response.data.errors[0]?.message : null) ||
        'تعذر الإرسال. حاول لاحقاً.';
      setSubmitErr(msg);
    }
  };

  return (
    <div className="bg-[#fdfbf7] min-h-screen" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12 sm:space-y-16">
        <header className="text-center space-y-4">
          <p className="text-sm font-medium text-[#c9a227] tracking-wide">معهد زاد الهداية — 1446 هـ / 2025 م</p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1a3a2f] leading-snug">
            توجيهات وردود على استفسارات الطلاب الجدد في معهد زاد الهداية
          </h1>
          <div className="h-1 w-24 bg-[#c9a227] mx-auto rounded-full opacity-80" />
        </header>

        <section aria-labelledby="institute-def">
          <SectionTitle icon={BookOpen} id="institute-def">
            تعريف بمعهد زاد الهداية
          </SectionTitle>
          <HighlightCard>
            <p className="text-stone-700 leading-[1.9] text-base sm:text-lg text-justify">
              هو معهد إسلامي يعنى بطلب العلم الشرعي وإعداد الدعاة، يُقدّم برنامجاً مبسّطاً ممتعاً يسعى لتكوين شخصية المسلم علمياً
              وإيمانياً وتربوياً، هدفه تحبيب عامة المسلمين بالعلم الشرعي وإيصاله لهم بأسلوب سهل وبطريقة ميسرة، بالإضافة إلى تثقيفهم
              في شتى مناحيه الشرعية المختلفة بدوام مسائي؛ ليكون مناسباً لأولئك الذين لا تسمح لهم أوقاتهم بالتفرغ بشكل كبير، للتعرّف
              على ما لا يسع المسلم المثقف المعاصر جهله من أمور دينه. فإذا كنتَ طالباً في الثانوية أو في الجامعة، أو كان عملك يأخذ
              الكثير من وقتك، فإننا نبشرك بأن التزامك بمساقات المعهد سيلائمك لتعلم دينك بإذن الله، ونرجو أن تجدوا ضالتكم في هذا
              المشروع، وعلى قدر الجد والاجتهاد يكون النفع وتكون الفائدة بإذن الله سبحانه وتعالى.
            </p>
            <p className="text-stone-700 leading-[1.9] text-base sm:text-lg text-justify mt-4">
              يتم تمرير البرنامج يومين أسبوعياً (في كل يوم مادتان) ويستمر لعامين كاملين، ومن ثم يكمل من نجح فيهما لعامين إضافيين.
            </p>
          </HighlightCard>
        </section>

        <section className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
          <a
            href={registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c9a227] text-white px-6 py-3 font-semibold shadow-md hover:bg-[#b08f20] transition min-h-[48px]"
          >
            رابط التسجيل للعام الدراسي الجديد 2025
          </a>
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a3a2f] text-white px-6 py-3 font-semibold hover:bg-[#143028] transition min-h-[48px]"
          >
            قناة اليوتيوب — المحاضرات مصوّرة
          </a>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#1a3a2f] text-[#1a3a2f] px-6 py-3 font-semibold hover:bg-[#1a3a2f]/5 transition min-h-[48px]"
          >
            تواصل معنا
          </Link>
        </section>

        <section>
          <SectionTitle>توضيح مهم للطالب الجديد</SectionTitle>
          <HighlightCard variant="amber">
            <ol className="list-decimal list-inside space-y-3 text-stone-800 leading-relaxed">
              <li>الطالب الجديد يلتحق بالمساقات (الدورات) الحالية — مباشرة على الزووم أو اليوتيوب.</li>
              <li>
                المساقات مادتها منفصلة عن مساقات العام الفائت (إن كان هناك تعلّق بالمادة الأولى يُعاد تعليمه في الدورة الجديدة).
              </li>
              <li>المساقات السابقة يمكن استدراكها بالرجوع إلى الفيديوهات المسجّلة.</li>
            </ol>
          </HighlightCard>
        </section>

        <section>
          <SectionTitle icon={GraduationCap}>مساقات السنة الثانية (الحالية) — الفصل الثاني</SectionTitle>
          <HighlightCard>
            <p className="text-stone-700 mb-4">
              قناة معهد زاد الهداية للعلوم الشرعية وإعداد الدعاة — تجدون فيها المحاضرات مصوّرة.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#c9a227] font-semibold underline-offset-4 hover:underline"
              >
                فتح قناة اليوتيوب
              </a>
            </div>
            <ul className="mt-6 space-y-2 text-stone-700">
              <li className="flex items-start gap-2">
                <span className="text-[#c9a227] mt-1">◆</span>
                <span>مواعيد المساقات خلال العام — تُعلَن عبر القنوات والمجموعات للمسجّلين.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#c9a227] mt-1">◆</span>
                <span>التقويم السنوي لمعهد زاد الهداية — يُحدَّث وفق كل عام دراسي.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#c9a227] mt-1">◆</span>
                <span className="font-medium text-[#1a3a2f]">جميع مواد الدورات موجودة في الموقع.</span>
              </li>
            </ul>
          </HighlightCard>
        </section>

        <section>
          <SectionTitle icon={ClipboardList}>الامتحانات</SectionTitle>
          <HighlightCard variant="rose">
            <p className="text-stone-800 leading-relaxed">
              <strong className="text-[#1a3a2f]">ملاحظة:</strong> الامتحانات تُقدَّم عن بُعد؛ طريقة الأسئلة اختيار من متعدد
              (أمريكية).
            </p>
          </HighlightCard>
        </section>

        <section>
          <SectionTitle>شهادة إنهاء مساقات معهد زاد الهداية</SectionTitle>
          <HighlightCard>
            <p className="text-stone-700 leading-relaxed mb-4">
              شرط الحصول على الشهادة منوط بتقديم جميع الاختبارات والنجاح فيها (وذلك لأن هذه هي الوسيلة المتاحة لمعرفة وقياس فهم
              الطالب للمادة). في حالة تعذّر التقدم لاختبارات موعد «أ» لظرف خاص، سيُتاح للطالب تقديم اختبارات موعد «ب» في بداية
              الفصل الذي يليه. ولمن لم ينجح بالاختبار ستكون علامته من مجموع 75.
            </p>
          </HighlightCard>
          <HighlightCard variant="amber">
            <p className="text-stone-800 leading-relaxed">
              <strong className="text-[#1a3a2f]">تنبيه:</strong> الشهادة شهادة خاصة تابعة لمشروع زاد الهداية، تُقدَّم كوسام شرف
              لاجتهادك وتضحيتك في طلب العلم الشرعي، وقبل ذلك لتذكيرك بعظم المسؤولية الملقاة على عاتقنا جميعاً.
            </p>
          </HighlightCard>
        </section>

        <section>
          <SectionTitle>قاعدة للطالب الجديد</SectionTitle>
          <HighlightCard>
            <p className="text-stone-800 font-medium leading-relaxed">
              كل طالب جديد ينضم لمعهد زاد الهداية — لا يمكنه تقديم الاختبارات حتى ينهي مادة المساق كاملةً دراسةً وفهماً.
            </p>
          </HighlightCard>
        </section>

        <section>
          <SectionTitle icon={MapPin}>الوصول إلى مسجد الصراط - باقة الغربية</SectionTitle>
          <HighlightCard>
            <p className="text-stone-700 leading-relaxed mb-4">
              موقع تمرير المساقات الحضورية هو مسجد الصراط - باقة الغربية. يمكنكم فتح الموقع مباشرة عبر الخرائط للوصول بسهولة.
            </p>
            <a
              href={mapsInfoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#c9a227] font-semibold underline-offset-4 hover:underline"
            >
              فتح الموقع على الخرائط
            </a>
          </HighlightCard>
        </section>

        <section>
          <SectionTitle icon={Car}>مواقف السيارات للرجال</SectionTitle>
          <HighlightCard>
            <p className="text-stone-700 leading-relaxed">
              توجد مواقف عامة تابعة للمسجد ومتاحة للجميع، كما توجد مواقف خاصة للنساء في الجهة الخلفية أيضاً.
            </p>
          </HighlightCard>
        </section>

        <section id="inquiry-form" className="scroll-mt-24">
          <SectionTitle icon={Send}>اكتب استفسارك هنا</SectionTitle>
          <p className="text-stone-600 mb-6 leading-relaxed">
            كل طالب لديه استفسار يسعدنا أن يبعثه هنا، وبإذن الله سنجيب عليه في آخر هذه الصفحة، ليستفيد منه بقية الطلاب.
          </p>
          <HighlightCard>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">الاسم</label>
                <input
                  {...register('name')}
                  className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:ring-2 focus:ring-[#c9a227]/50 focus:border-[#c9a227]"
                />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  dir="ltr"
                  className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-left focus:ring-2 focus:ring-[#c9a227]/50"
                  {...register('email')}
                />
                {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">رقم الهاتف (اختياري)</label>
                <input
                  dir="ltr"
                  className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-left focus:ring-2 focus:ring-[#c9a227]/50"
                  {...register('phone')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">عنوان الاستفسار</label>
                <input {...register('subject')} className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:ring-2 focus:ring-[#c9a227]/50" />
                {errors.subject && <p className="text-red-600 text-sm mt-1">{errors.subject.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">نص الاستفسار</label>
                <textarea
                  rows={5}
                  {...register('body')}
                  className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:ring-2 focus:ring-[#c9a227]/50 resize-y min-h-[120px]"
                />
                {errors.body && <p className="text-red-600 text-sm mt-1">{errors.body.message}</p>}
              </div>
              {submitOk && (
                <p className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 text-sm">{submitOk}</p>
              )}
              {submitErr && (
                <p className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">{submitErr}</p>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto rounded-xl bg-[#1a3a2f] text-white px-8 py-3 font-semibold hover:bg-[#143028] disabled:opacity-60 min-h-[48px]"
              >
                {isSubmitting ? 'جاري الإرسال…' : 'إرسال الاستفسار'}
              </button>
            </form>
          </HighlightCard>
        </section>

        <section id="faq-answers" className="scroll-mt-24 pb-8">
          <SectionTitle>إجابة الاستفسارات</SectionTitle>
          <p className="text-stone-600 mb-6 text-sm sm:text-base">
            تجدون أدناه إجابات منشورة يديرها فريق الإدارة؛ ويُضاف إليها ما يُنشر من استفسارات الطلاب بعد الرد عليها.
          </p>
          <div className="space-y-3">
            {(faqList ?? []).map((item) => {
              const open = openFaq === item.id;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-stone-200/80 bg-white shadow-sm overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : item.id)}
                    className="flex w-full items-center justify-between gap-3 text-right px-4 sm:px-5 py-4 hover:bg-stone-50/80 transition"
                    aria-expanded={open}
                  >
                    <span className="font-semibold text-[#1a3a2f] leading-snug">{item.questionAr}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#c9a227] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {open && (
                    <div className="px-4 sm:px-5 pb-5 pt-0 text-stone-700 leading-relaxed whitespace-pre-wrap border-t border-stone-100">
                      {item.answerAr}
                    </div>
                  )}
                </div>
              );
            })}
            {faqList && faqList.length === 0 && (
              <p className="text-stone-500 text-center py-8">لا توجد إجابات منشورة بعد.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
