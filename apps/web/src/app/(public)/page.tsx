'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { BookIcon, PlayIcon, ChartIcon, GraduateIcon, AwardIcon, QuranIcon } from '@/components/Icons';
import HomePromotionsSection from '@/components/HomePromotionsSection';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if user is logged in but don't redirect
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        })
        .catch(() => {
          try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
              setUser(JSON.parse(userStr));
            }
          } catch (e) {
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
          }
        });
    } else {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          setUser(JSON.parse(userStr));
        }
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'TEACHER') return '/teacher';
    return '/dashboard';
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden -mt-20 pt-28 pb-32 sm:pt-32 sm:pb-36">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-bl from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24]"></div>
        
        {/* Subtle Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'url(/islamic-bg.png)',
            backgroundSize: '400px',
            backgroundPosition: 'center',
          }}
        ></div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#c9a227]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#c9a227]/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        
        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Logo */}
          <div className={`mb-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <div className="inline-block relative">
              <div className="absolute inset-0 bg-[#c9a227]/15 blur-2xl rounded-full scale-150"></div>
              <img 
                src="/photos/ZadLogo.jpeg" 
                alt="زاد الهداية" 
                className="relative h-28 md:h-36 w-auto object-contain rounded-2xl shadow-2xl ring-2 ring-[#c9a227]/25"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>
          
          {/* Main Heading */}
          <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            زاد <span className="text-[#c9a227]">الهداية</span>
          </h1>
          
          {/* Decorative Line */}
          <div className={`flex items-center justify-center gap-4 mb-6 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-16 h-[1px] bg-gradient-to-r from-transparent to-[#c9a227]/60"></div>
            <div className="w-2 h-2 rotate-45 bg-[#c9a227]"></div>
            <div className="w-16 h-[1px] bg-gradient-to-l from-transparent to-[#c9a227]/60"></div>
          </div>
          
          {/* Subtitle */}
          <p className={`text-xl md:text-2xl text-white/90 mb-4 font-medium transition-all duration-1000 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            معهد للعلوم الشرعية
          </p>
          
          <p className={`text-base md:text-lg text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            رحلة علمية متكاملة في طلب العلم الشرعي، مع نخبة من العلماء والمشايخ
          </p>
          
          {/* CTA Buttons */}
          <div className={`flex gap-4 justify-center flex-wrap mb-12 transition-all duration-1000 delay-600 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {user ? (
              <>
                <Link 
                  href={getDashboardLink()} 
                  className="group px-8 py-4 bg-[#c9a227] text-white rounded-xl font-bold text-lg hover:bg-[#b08f20] transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {user?.role === 'STUDENT' ? 'زادي' : 'لوحة التحكم'}
                </Link>
                <Link 
                  href="/courses" 
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all duration-300"
                >
                  استكشف الدورات
                </Link>
              </>
            ) : (
              <>
                <Link 
                  href="/register" 
                  className="group px-8 py-4 bg-[#c9a227] text-white rounded-xl font-bold text-lg hover:bg-[#b08f20] transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  ابدأ رحلتك الآن
                </Link>
                <Link 
                  href="/courses" 
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all duration-300"
                >
                  تصفح الدورات
                </Link>
              </>
            )}
          </div>
          
          {/* Quranic Verse */}
          <div className={`transition-all duration-1000 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-[#c9a227]/80 text-sm md:text-base">
              « وَقُل رَّبِّ زِدْنِي عِلْمًا »
            </p>
          </div>
        </div>
        
        {/* Bottom Gradient Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-stone-50 to-transparent"></div>
      </section>

      {user ? (
        <HomePromotionsSection variant="home" userGender={user.gender} />
      ) : null}

      {/* Features Section */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a3a2f] mb-4">
              لماذا زاد الهداية؟
            </h2>
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-[1px] bg-[#c9a227]/50"></div>
              <div className="w-1.5 h-1.5 rotate-45 bg-[#c9a227]"></div>
              <div className="w-12 h-[1px] bg-[#c9a227]/50"></div>
            </div>
            <p className="text-stone-600 max-w-2xl mx-auto">
              منصة تعليمية متكاملة صُممت لتيسير طلب العلم الشرعي بأحدث الوسائل
            </p>
          </div>
          
          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-100 hover:border-[#c9a227]/20">
              <div className="w-14 h-14 bg-[#1a3a2f]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#1a3a2f] transition-colors duration-300">
                <BookIcon className="text-[#1a3a2f] group-hover:text-white transition-colors duration-300" size={28} />
              </div>
              <h3 className="text-xl font-bold text-[#1a3a2f] mb-3">مناهج علمية متكاملة</h3>
              <p className="text-stone-600 leading-relaxed">
                دورات شاملة في التفسير والحديث والفقه والعقيدة وعلوم القرآن، مُعدّة بعناية فائقة
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-100 hover:border-[#c9a227]/20">
              <div className="w-14 h-14 bg-[#1a3a2f]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#1a3a2f] transition-colors duration-300">
                <PlayIcon className="text-[#1a3a2f] group-hover:text-white transition-colors duration-300" size={28} />
              </div>
              <h3 className="text-xl font-bold text-[#1a3a2f] mb-3">دروس تفاعلية</h3>
              <p className="text-stone-600 leading-relaxed">
                محاضرات مسجلة عالية الجودة مع إمكانية التفاعل والاستفسار من المشايخ
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-100 hover:border-[#c9a227]/20">
              <div className="w-14 h-14 bg-[#1a3a2f]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#1a3a2f] transition-colors duration-300">
                <ChartIcon className="text-[#1a3a2f] group-hover:text-white transition-colors duration-300" size={28} />
              </div>
              <h3 className="text-xl font-bold text-[#1a3a2f] mb-3">تتبع التقدم</h3>
              <p className="text-stone-600 leading-relaxed">
                راقب مسيرتك العلمية وتقدمك في كل دورة مع تقارير مفصلة وإحصائيات
              </p>
            </div>
            
            {/* Feature 4 */}
            <div className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-100 hover:border-[#c9a227]/20">
              <div className="w-14 h-14 bg-[#1a3a2f]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#1a3a2f] transition-colors duration-300">
                <QuranIcon className="text-[#1a3a2f] group-hover:text-white transition-colors duration-300" size={28} />
              </div>
              <h3 className="text-xl font-bold text-[#1a3a2f] mb-3">اختبارات ومراجعات</h3>
              <p className="text-stone-600 leading-relaxed">
                اختبارات دورية لتثبيت المعلومات ومراجعات شاملة لكل وحدة دراسية
              </p>
            </div>
            
            {/* Feature 5 */}
            <div className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-100 hover:border-[#c9a227]/20">
              <div className="w-14 h-14 bg-[#1a3a2f]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#1a3a2f] transition-colors duration-300">
                <GraduateIcon className="text-[#1a3a2f] group-hover:text-white transition-colors duration-300" size={28} />
              </div>
              <h3 className="text-xl font-bold text-[#1a3a2f] mb-3">شهادات معتمدة</h3>
              <p className="text-stone-600 leading-relaxed">
                احصل على شهادة إتمام معتمدة من المعهد عند إكمال كل دورة بنجاح
              </p>
            </div>
            
            {/* Feature 6 */}
            <div className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-100 hover:border-[#c9a227]/20">
              <div className="w-14 h-14 bg-[#1a3a2f]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#1a3a2f] transition-colors duration-300">
                <AwardIcon className="text-[#1a3a2f] group-hover:text-white transition-colors duration-300" size={28} />
              </div>
              <h3 className="text-xl font-bold text-[#1a3a2f] mb-3">مشايخ متخصصون</h3>
              <p className="text-stone-600 leading-relaxed">
                تعلّم على يد نخبة من العلماء والمشايخ المتخصصين في علومهم
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] relative overflow-hidden">
        {/* Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'url(/islamic-bg.png)',
            backgroundSize: '300px',
          }}
        ></div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            ابدأ رحلتك في طلب العلم
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
            انضم إلى طلبة العلم الذين اختاروا زاد الهداية لتعلم العلوم الشرعية
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link 
              href="/register" 
              className="px-10 py-4 bg-[#c9a227] text-white rounded-xl font-bold text-lg hover:bg-[#b08f20] transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              سجّل مجاناً
            </Link>
            <Link 
              href="/courses" 
              className="px-10 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all duration-300"
            >
              استعرض الدورات
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

