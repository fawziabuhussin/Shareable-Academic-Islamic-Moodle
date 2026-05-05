import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageIcon } from '@/components/Icons';
import { SITE_CONTACT } from '@/lib/siteContact';

export const metadata: Metadata = {
  title: 'تواصل معنا',
  description:
    'طرق التواصل مع معهد زاد الهداية: البريد الإلكتروني، الهاتف، العنوان، وصفحات التواصل الاجتماعي. نرحب باستفساراتكم وملاحظاتكم.',
  openGraph: {
    title: 'تواصل معنا | زاد الهداية',
    description: 'تواصل مع معهد زاد الهداية للعلوم الشرعية',
  },
};

function ContactCard({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 sm:p-7 hover:border-[#c9a227]/40 hover:shadow-md transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-[#1a3a2f]/8 text-[#1a3a2f] flex items-center justify-center">{icon}</div>
        <div className="min-w-0 flex-1 text-right">
          <h2 className="text-lg font-bold text-[#1a3a2f] mb-2">{title}</h2>
          <div className="text-stone-600 text-sm sm:text-base leading-relaxed space-y-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function ContactPage() {
  const wa = SITE_CONTACT.phoneE164.replace(/\D/g, '');

  return (
    <div className="min-h-screen bg-[#fdfbf7]">
      <div className="relative bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'url(/islamic-bg.png)',
            backgroundSize: '380px',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center ring-1 ring-white/20">
                <MessageIcon className="text-[#c9a227]" size={28} />
              </div>
              <div>
                <p className="text-[#c9a227]/90 text-sm font-medium mb-1">معهد زاد الهداية</p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">تواصل معنا</h1>
                <p className="mt-3 text-white/75 text-sm sm:text-base max-w-xl leading-relaxed">
                  نسعد بسماعكم. يمكنكم مراسلتنا للاستفسار عن الدورات، التسجيل، أو لأي ملاحظة تخص المنصة.
                </p>
              </div>
            </div>
            <Link
              href="/courses"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 border border-white/20 transition whitespace-nowrap"
            >
              تصفح الدورات
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-6">
        <div className="rounded-2xl bg-[#1a3a2f]/[0.04] border border-[#1a3a2f]/10 p-5 sm:p-6 text-stone-700 text-sm sm:text-base leading-relaxed">
          <p>
            <strong className="text-[#1a3a2f]">المنصة متاحة للجميع مجاناً.</strong> لمن يحتاج مساعدة في إنشاء موقع إلكتروني
            لمشروعه أو لديه استفسار تقني يخص الموقع، يرجى التواصل معنا عبر البريد أدناه وسنبذل جهدنا للرد في أقرب وقت.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-5">
          <ContactCard
            title="البريد الإلكتروني"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            }
          >
            <p>للاستفسارات العامة، الدعم، والمقترحات:</p>
            <a
              href={`mailto:${SITE_CONTACT.email}`}
              className="inline-block font-semibold text-[#1a3a2f] hover:text-[#c9a227] underline underline-offset-4 transition-colors break-all"
            >
              {SITE_CONTACT.email}
            </a>
          </ContactCard>

          <ContactCard
            title="الهاتف وواتساب"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            }
          >
            <p dir="ltr" className="text-right sm:text-lg font-semibold text-stone-800">
              {SITE_CONTACT.phoneDisplay}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href={`tel:${SITE_CONTACT.phoneE164}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1a3a2f] hover:text-[#c9a227] transition"
              >
                اتصال
              </a>
              <span className="text-stone-300">|</span>
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1a3a2f] hover:text-[#c9a227] transition"
              >
                واتساب
              </a>
            </div>
          </ContactCard>

          <ContactCard
            title="الموقع"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          >
            <p className="font-medium text-stone-800">{SITE_CONTACT.location}</p>
            <p className="text-stone-500 text-sm">داخل أرض فلسطين المحتلة — نرحب بالتواصل عن بُعد عبر القنوات أعلاه.</p>
          </ContactCard>

          <ContactCard
            title="وسائل التواصل الاجتماعي"
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            }
          >
            <p className="mb-3">تابعونا للاطلاع على الأخبار والمحتوى:</p>
            <ul className="space-y-2">
              <li>
                <a
                  href={SITE_CONTACT.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#1a3a2f] hover:text-[#c9a227] transition underline underline-offset-4"
                >
                  صفحة فيسبوك — نادي الهداية
                </a>
              </li>
              <li>
                <a
                  href={SITE_CONTACT.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#1a3a2f] hover:text-[#c9a227] transition underline underline-offset-4"
                >
                  حساب إنستغرام
                </a>
              </li>
            </ul>
          </ContactCard>
        </div>

        <div className="text-center pt-4">
          <Link href="/about" className="text-sm text-stone-600 hover:text-[#1a3a2f] underline underline-offset-4 transition">
            من نحن — رسالتنا وأهدافنا
          </Link>
        </div>
      </div>
    </div>
  );
}
