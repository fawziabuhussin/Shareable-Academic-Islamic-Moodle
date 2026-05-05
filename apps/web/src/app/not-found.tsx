'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdfbf7] via-[#f8f4ec] to-[#fdfbf7] flex items-center justify-center px-4 overflow-hidden relative">
      {/* Subtle Islamic geometric pattern overlay */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="islamicPattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <polygon points="50,10 56,28 74,22 64,36 82,44 64,52 74,68 56,62 50,80 44,62 26,68 36,52 18,44 36,36 26,22 44,28" fill="none" stroke="#1a5f4a" strokeWidth="0.6" />
              <circle cx="50" cy="50" r="8" fill="none" stroke="#c9a227" strokeWidth="0.4" />
              <line x1="0" y1="0" x2="50" y2="50" stroke="#1a5f4a" strokeWidth="0.15" />
              <line x1="100" y1="0" x2="50" y2="50" stroke="#1a5f4a" strokeWidth="0.15" />
              <line x1="0" y1="100" x2="50" y2="50" stroke="#1a5f4a" strokeWidth="0.15" />
              <line x1="100" y1="100" x2="50" y2="50" stroke="#1a5f4a" strokeWidth="0.15" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#islamicPattern)" />
        </svg>
      </div>

      {/* Top decorative bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/60 via-gold to-primary/60" />

      {/* Soft radial glow behind content */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center max-w-md mx-auto">
        {/* Logo */}
        <div className="relative mb-6">
          <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden shadow-xl shadow-primary/15 border-2 border-gold/20 ring-4 ring-primary/5">
            <Image
              src="/photos/ZadLogo.jpeg"
              alt="زاد الهداية"
              width={96}
              height={96}
              className="object-cover w-full h-full"
              priority
            />
          </div>
        </div>

        {/* 404 number */}
        <div className="relative mb-6">
          <p className="text-[120px] leading-none font-bold text-primary/[0.07] select-none tracking-wider">404</p>
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-2xl font-bold text-primary">
              الصفحة غير موجودة
            </h1>
          </div>
        </div>

        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-4 mb-5">
          <div className="h-px w-20 bg-gradient-to-r from-transparent via-gold/40 to-gold/60" />
          <div className="w-2 h-2 rotate-45 bg-gold/40" />
          <div className="h-px w-20 bg-gradient-to-l from-transparent via-gold/40 to-gold/60" />
        </div>

        <p className="text-earth text-[15px] leading-relaxed mb-6">
          عذراً، لم نتمكن من العثور على الصفحة التي تبحث عنها
        </p>

        {/* Quran verse card */}
        <div className="bg-white/60 backdrop-blur-sm border border-primary/8 rounded-2xl p-5 mb-8 shadow-sm">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-px w-8 bg-gold/30" />
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-gold/60" fill="currentColor">
              <polygon points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9" />
            </svg>
            <div className="h-px w-8 bg-gold/30" />
          </div>
          <p className="text-primary/70 text-[17px] leading-[2.2]" style={{ fontFamily: 'var(--font-noto), serif' }}>
            ﴿ وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا ﴾
          </p>
          <p className="text-earth/50 text-xs mt-2.5">سورة الطلاق - آية ٢</p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary-dark text-white px-7 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            العودة للرئيسية
          </Link>

          <button
            onClick={() => window.history.back()}
            className="group inline-flex items-center justify-center gap-2.5 bg-white/80 hover:bg-white text-primary border border-primary/15 hover:border-primary/30 px-7 py-3 rounded-xl font-semibold transition-all duration-300 hover:-translate-y-0.5 shadow-sm hover:shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:-translate-x-1">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            الرجوع للخلف
          </button>
        </div>

        {/* Footer */}
        <div className="mt-14 flex items-center justify-center gap-3 text-earth/25">
          <div className="h-px w-10 bg-earth/15" />
          <p className="text-[11px] tracking-wide">زاد الهداية</p>
          <div className="h-px w-10 bg-earth/15" />
        </div>
      </div>
    </div>
  );
}
