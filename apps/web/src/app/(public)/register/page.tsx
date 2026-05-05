'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import DatePicker from '@/components/DatePicker';
import GenderSelect from '@/components/GenderSelect';
import { showSuccess, showError, TOAST_MESSAGES } from '@/lib/toast';
import { handleLoginRedirect, navigateTo } from '@/lib/navigation';

interface FormData {
  // Step 1
  firstName: string;
  fatherName: string;
  familyName: string;
  email: string;
  password: string;
  confirmPassword: string;
  // Step 2
  dateOfBirth: Date | null;
  phone: string;
  profession: string;
  gender: 'MALE' | 'FEMALE' | '';
  idNumber: string;
  location: string;
}

interface FormErrors {
  firstName?: string;
  fatherName?: string;
  familyName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  dateOfBirth?: string;
  phone?: string;
  profession?: string;
  gender?: string;
  idNumber?: string;
  location?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    fatherName: '',
    familyName: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: null,
    phone: '',
    profession: '',
    gender: '',
    idNumber: '',
    location: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLoginSuccess = (user: any, accessToken: string) => {
    // Store token and user data
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(user));

    showSuccess(TOAST_MESSAGES.LOGIN_SUCCESS);

    // Check if profile is complete
    if (!user.profileComplete) {
      // Redirect to complete profile page
      window.location.href = '/complete-profile';
      return;
    }

    // Use centralized login redirect (hard navigation to refresh app state)
    handleLoginRedirect(user.role);
  };

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName || formData.firstName.length < 2) {
      newErrors.firstName = 'الاسم الشخصي يجب أن يكون حرفين على الأقل';
    }
    if (!formData.fatherName || formData.fatherName.length < 2) {
      newErrors.fatherName = 'اسم الوالد يجب أن يكون حرفين على الأقل';
    }
    if (!formData.familyName || formData.familyName.length < 2) {
      newErrors.familyName = 'اسم العائلة يجب أن يكون حرفين على الأقل';
    }
    if (!formData.email || !formData.email.includes('@')) {
      newErrors.email = 'البريد الإلكتروني غير صالح';
    }
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'تأكيد كلمة المرور مطلوب';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'كلمتا المرور غير متطابقتين';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'تاريخ الولادة مطلوب';
    }
    if (!formData.phone || formData.phone.length < 7 || formData.phone.length > 10) {
      newErrors.phone = 'رقم الهاتف يجب أن يكون بين 7 و 10 أرقام';
    } else if (!/^[0-9]+$/.test(formData.phone)) {
      newErrors.phone = 'رقم الهاتف يجب أن يحتوي على أرقام فقط';
    }
    if (!formData.profession || formData.profession.length < 2) {
      newErrors.profession = 'المهنة مطلوبة';
    }
    if (!formData.gender) {
      newErrors.gender = 'يرجى اختيار الفئة';
    }
    if (!formData.idNumber || formData.idNumber.length !== 9) {
      newErrors.idNumber = 'رقم الهوية يجب أن يكون 9 أرقام بالضبط';
    } else if (!/^[0-9]+$/.test(formData.idNumber)) {
      newErrors.idNumber = 'رقم الهوية يجب أن يحتوي على أرقام فقط';
    }
    if (!formData.location || formData.location.length < 2) {
      newErrors.location = 'البلد مطلوب';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goToStep2 = () => {
    if (validateStep1()) {
      setStep(2);
      setErrors({});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateStep2()) {
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/register', {
        firstName: formData.firstName,
        fatherName: formData.fatherName,
        familyName: formData.familyName,
        email: formData.email,
        password: formData.password,
        dateOfBirth: formData.dateOfBirth?.toISOString(),
        phone: formData.phone,
        profession: formData.profession,
        gender: formData.gender,
        idNumber: formData.idNumber,
        location: formData.location,
      });
      showSuccess(TOAST_MESSAGES.REGISTER_SUCCESS);
      navigateTo('/login?registered=true', router);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'فشل التسجيل';
      setGeneralError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    
    setGeneralError('');
    setLoading(true);

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      const errorMsg = 'Google Client ID غير موجود. أضف NEXT_PUBLIC_GOOGLE_CLIENT_ID في .env.local';
      setGeneralError(errorMsg);
      showError(errorMsg);
      setLoading(false);
      return;
    }

    // OAuth 2.0 popup flow parameters
    const redirectUri = window.location.origin + '/auth/google/callback';
    const scope = 'openid email profile';
    const responseType = 'token id_token';
    const state = Math.random().toString(36).substring(7);
    
    // Store state for verification
    sessionStorage.setItem('google_oauth_state', state);

    // Build OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', responseType);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('nonce', Math.random().toString(36).substring(7));

    // Open popup window
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      authUrl.toString(),
      'Google Sign In',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );

    if (!popup) {
      const errorMsg = 'فشل فتح نافذة Google. قد يكون المتصفح قد حظر النوافذ المنبثقة.';
      setGeneralError(errorMsg);
      showError(errorMsg);
      setLoading(false);
      return;
    }

    // Listen for message from popup
    const handleMessage = async (event: MessageEvent) => {
      // Verify origin
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'GOOGLE_AUTH_SUCCESS' && event.data.idToken) {
        window.removeEventListener('message', handleMessage);
        
        try {
          const res = await api.post('/auth/google', { token: event.data.idToken });
          const { accessToken, user } = res.data;
          handleLoginSuccess(user, accessToken);
        } catch (err: any) {
          console.error('Google OAuth error:', err);
          const errorMsg = err.response?.data?.message || 'فشل التسجيل باستخدام Google';
          setGeneralError(errorMsg);
          showError(errorMsg);
          setLoading(false);
        }
      } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        window.removeEventListener('message', handleMessage);
        const errorMsg = event.data.error || 'فشل التسجيل باستخدام Google';
        setGeneralError(errorMsg);
        showError(errorMsg);
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);

    // Check if popup was closed
    const checkPopup = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopup);
        window.removeEventListener('message', handleMessage);
        setLoading(false);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-row-reverse" dir="rtl">
      {/* Left side - Decorative Islamic Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center p-12 bg-[#1a3a2f]">
        {/* Content - centered */}
        <div
          className={`relative z-10 text-center transition-all duration-1000 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        >
          {/* Logo */}
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-[#c9a227]/10 blur-2xl rounded-full scale-150"></div>
            <img
              src="/photos/ZadLogo.jpeg"
              alt="زاد الهداية"
              className="relative h-36 w-auto mx-auto object-contain rounded-2xl shadow-2xl ring-2 ring-[#c9a227]/25"
            />
          </div>

          {/* Tagline */}
          <p className="text-white text-lg mb-4 drop-shadow-md font-medium">ابدأ رحلتك في طلب العلم</p>

          {/* Decorative line */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-[1px] bg-[#c9a227]/70"></div>
            <div className="w-2 h-2 rotate-45 bg-[#c9a227]"></div>
            <div className="w-12 h-[1px] bg-[#c9a227]/70"></div>
          </div>

          {/* Surah Al-Alaq - Mushaf-inspired frame */}
          <div className="relative mt-4 max-w-md mx-auto">
            {/* Outer ornate border */}
            <div className="absolute -inset-2 border-2 border-[#c9a227]/30 rounded-sm">
              {/* Corner flourishes */}
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-[#c9a227]/70 rounded-tr-sm"></div>
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-[#c9a227]/70 rounded-tl-sm"></div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-[#c9a227]/70 rounded-br-sm"></div>
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-[#c9a227]/70 rounded-bl-sm"></div>
            </div>

            {/* Inner frame */}
            <div className="relative border border-[#c9a227]/50 rounded-sm bg-[#1a3a2f]/60 backdrop-blur-sm overflow-hidden">
              {/* Surah header banner */}
              <div className="bg-[#c9a227]/15 border-b border-[#c9a227]/40 py-2.5 px-4 flex items-center justify-center">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-[#c9a227]/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L9 7H3l4.5 5L5.5 22 12 17.5 18.5 22l-2-10L21 7h-6L12 2z"/></svg>
                  <span className="text-[#c9a227] text-sm font-bold tracking-wider">سورة العلق</span>
                  <svg className="w-4 h-4 text-[#c9a227]/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L9 7H3l4.5 5L5.5 22 12 17.5 18.5 22l-2-10L21 7h-6L12 2z"/></svg>
                </div>
              </div>

              {/* Verses body */}
              <div className="px-6 py-5">
                {/* Bismillah */}
                <p className="text-[#c9a227] text-xl font-bold text-center mb-5" style={{ fontFamily: 'serif' }}>
                  ﷽
                </p>

                {/* Verses as flowing text with end-of-ayah markers */}
                <p className="text-white/95 text-lg text-center leading-[2.2] tracking-wide" style={{ fontFamily: 'serif' }}>
                  اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ
                  <span className="inline-block mx-1 text-[#c9a227] text-base"> ﴿١﴾ </span>
                  خَلَقَ الْإِنسَانَ مِنْ عَلَقٍ
                  <span className="inline-block mx-1 text-[#c9a227] text-base"> ﴿٢﴾ </span>
                  اقْرَأْ وَرَبُّكَ الْأَكْرَمُ
                  <span className="inline-block mx-1 text-[#c9a227] text-base"> ﴿٣﴾ </span>
                  الَّذِي عَلَّمَ بِالْقَلَمِ
                  <span className="inline-block mx-1 text-[#c9a227] text-base"> ﴿٤﴾ </span>
                  عَلَّمَ الْإِنسَانَ مَا لَمْ يَعْلَمْ
                  <span className="inline-block mx-1 text-[#c9a227] text-base"> ﴿٥﴾ </span>
                </p>
              </div>

              {/* Bottom border band */}
              <div className="bg-[#c9a227]/15 border-t border-[#c9a227]/40 py-1.5 flex items-center justify-center gap-3">
                <div className="w-8 h-[1px] bg-[#c9a227]/40"></div>
                <div className="w-2 h-2 rotate-45 border border-[#c9a227]/50"></div>
                <div className="w-8 h-[1px] bg-[#c9a227]/40"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom decorative border */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a227]/50 to-transparent"></div>
      </div>

      {/* Right side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-[#fdfbf7] to-[#f5f0e8] relative overflow-hidden">
        {/* Watermark pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'url(/islamic-bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
          }}
        ></div>

        <div
          className={`w-full max-w-lg relative z-10 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-6">
            <div className="mb-3">
              <img
                src="/photos/ZadLogo.jpeg"
                alt="زاد الهداية"
                className="h-24 w-auto mx-auto object-contain rounded-xl shadow-lg ring-1 ring-[#c9a227]/15"
              />
            </div>
            <p className="text-[#1a3a2f]/60 text-sm">ابدأ رحلتك في طلب العلم</p>
          </div>

          {/* Form Card */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-[#c9a227]/10">
            <h2 className="text-2xl font-bold text-center mb-4 text-[#1a3a2f]">إنشاء حساب جديد</h2>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#1a3a2f]' : 'text-gray-400'}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step >= 1 ? 'bg-[#1a3a2f] text-white' : 'bg-gray-200'
                  }`}
                >
                  1
                </div>
                <span className="text-sm hidden sm:inline">المعلومات الأساسية</span>
              </div>
              <div className="w-8 h-[2px] bg-gray-200">
                <div
                  className={`h-full bg-[#1a3a2f] transition-all duration-300 ${step >= 2 ? 'w-full' : 'w-0'}`}
                />
              </div>
              <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#1a3a2f]' : 'text-gray-400'}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step >= 2 ? 'bg-[#1a3a2f] text-white' : 'bg-gray-200'
                  }`}
                >
                  2
                </div>
                <span className="text-sm hidden sm:inline">البيانات الشخصية</span>
              </div>
            </div>

            {generalError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {generalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Step 1 */}
              {step === 1 && (
                <>
                  {/* Name fields in 3-column grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#1a3a2f]/80 mb-2">
                        الاسم الشخصي <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => {
                          setFormData({ ...formData, firstName: e.target.value });
                          if (errors.firstName) setErrors({ ...errors, firstName: '' });
                        }}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] text-gray-800 bg-white/80 transition-all duration-200 ${
                          errors.firstName ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="الاسم"
                      />
                      {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1a3a2f]/80 mb-2">
                        اسم الوالد <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.fatherName}
                        onChange={(e) => {
                          setFormData({ ...formData, fatherName: e.target.value });
                          if (errors.fatherName) setErrors({ ...errors, fatherName: '' });
                        }}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] text-gray-800 bg-white/80 transition-all duration-200 ${
                          errors.fatherName ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="الوالد"
                      />
                      {errors.fatherName && <p className="text-red-500 text-xs mt-1">{errors.fatherName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1a3a2f]/80 mb-2">
                        اسم العائلة <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.familyName}
                        onChange={(e) => {
                          setFormData({ ...formData, familyName: e.target.value });
                          if (errors.familyName) setErrors({ ...errors, familyName: '' });
                        }}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] text-gray-800 bg-white/80 transition-all duration-200 ${
                          errors.familyName ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="العائلة"
                      />
                      {errors.familyName && <p className="text-red-500 text-xs mt-1">{errors.familyName}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1a3a2f]/80 mb-2">
                      البريد الإلكتروني <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (errors.email) setErrors({ ...errors, email: '' });
                      }}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] text-gray-800 bg-white/80 transition-all duration-200 ${
                        errors.email ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="example@email.com"
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1a3a2f]/80 mb-2">
                      كلمة المرور <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => {
                          setFormData({ ...formData, password: e.target.value });
                          if (errors.password) setErrors({ ...errors, password: '' });
                        }}
                        className={`w-full px-4 py-3 pl-12 border rounded-xl focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] text-gray-800 bg-white/80 transition-all duration-200 ${
                          errors.password ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                    <p className="mt-1.5 text-xs text-gray-500">يجب أن تكون 6 أحرف على الأقل</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1a3a2f]/80 mb-2">
                      تأكيد كلمة المرور <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => {
                          setFormData({ ...formData, confirmPassword: e.target.value });
                          if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                        }}
                        className={`w-full px-4 py-3 pl-12 border rounded-xl focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] text-gray-800 bg-white/80 transition-all duration-200 ${
                          errors.confirmPassword ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                  </div>

                  <button
                    type="button"
                    onClick={goToStep2}
                    className="w-full bg-[#1a3a2f] text-white py-3.5 rounded-xl font-bold hover:bg-[#143026] transition-all duration-300 shadow-lg hover:shadow-xl mt-2"
                  >
                    التالي
                  </button>
                </>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <>
                  <DatePicker
                    label="تاريخ الولادة"
                    value={formData.dateOfBirth}
                    onChange={(date) => {
                      setFormData({ ...formData, dateOfBirth: date });
                      if (errors.dateOfBirth) setErrors({ ...errors, dateOfBirth: '' });
                    }}
                    maxDate={new Date()}
                    minDate={new Date('1900-01-01')}
                    placeholder="اختر تاريخ الولادة"
                    error={errors.dateOfBirth}
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#1a3a2f]/80 mb-2">
                        الهاتف <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setFormData({ ...formData, phone: value });
                          if (errors.phone) setErrors({ ...errors, phone: '' });
                        }}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] text-gray-800 bg-white/80 transition-all duration-200 ${
                          errors.phone ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="05xxxxxxxx"
                        maxLength={10}
                      />
                      {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1a3a2f]/80 mb-2">
                        المهنة <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.profession}
                        onChange={(e) => {
                          setFormData({ ...formData, profession: e.target.value });
                          if (errors.profession) setErrors({ ...errors, profession: '' });
                        }}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] text-gray-800 bg-white/80 transition-all duration-200 ${
                          errors.profession ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="المهنة"
                      />
                      {errors.profession && <p className="text-red-500 text-xs mt-1">{errors.profession}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <GenderSelect
                      label="الفئة"
                      value={formData.gender}
                      onChange={(value) => {
                        setFormData({ ...formData, gender: value });
                        if (errors.gender) setErrors({ ...errors, gender: '' });
                      }}
                      error={errors.gender}
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-[#1a3a2f]/80 mb-2">
                        رقم الهوية <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.idNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setFormData({ ...formData, idNumber: value });
                          if (errors.idNumber) setErrors({ ...errors, idNumber: '' });
                        }}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] text-gray-800 bg-white/80 transition-all duration-200 ${
                          errors.idNumber ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="رقم الهوية (9 أرقام)"
                        maxLength={9}
                      />
                      {errors.idNumber && <p className="text-red-500 text-xs mt-1">{errors.idNumber}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1a3a2f]/80 mb-2">
                        البلد <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => {
                          setFormData({ ...formData, location: e.target.value });
                          if (errors.location) setErrors({ ...errors, location: '' });
                        }}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] text-gray-800 bg-white/80 transition-all duration-200 ${
                          errors.location ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="البلد"
                      />
                      {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-bold hover:bg-gray-200 transition-all duration-300"
                    >
                      السابق
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-[#1a3a2f] text-white py-3.5 rounded-xl font-bold hover:bg-[#143026] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          جاري الإنشاء...
                        </span>
                      ) : (
                        'إنشاء حساب'
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>

            {/* OAuth - only show on step 1 */}
            {step === 1 && (
              <>
                {/* Decorative Divider */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 bg-white text-gray-400 text-sm flex items-center gap-2">
                      <span className="w-1 h-1 rotate-45 bg-[#c9a227]"></span>
                      أو
                      <span className="w-1 h-1 rotate-45 bg-[#c9a227]"></span>
                    </span>
                  </div>
                </div>

                {/* OAuth Buttons */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>التسجيل باستخدام Google</span>
                  </button>

                </div>
              </>
            )}

            {/* Login link */}
            <p className="mt-5 text-center text-gray-600">
              لديك حساب بالفعل؟{' '}
              <Link
                href="/login"
                className="text-[#1a3a2f] font-semibold hover:text-[#c9a227] transition-colors duration-200"
              >
                سجل الدخول
              </Link>
            </p>
          </div>

          {/* Bottom quote - desktop only */}
          <p className="hidden lg:block text-center text-[#1a3a2f]/50 text-xs mt-6">
            « العِلْمُ نُورٌ يَقْذِفُهُ اللَّهُ فِي قَلْبِ مَنْ يَشَاءُ »
          </p>
        </div>
      </div>
    </div>
  );
}
