'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import DatePicker from '@/components/DatePicker';
import GenderSelect from '@/components/GenderSelect';
import { showSuccess, showError } from '@/lib/toast';
import { handleLoginRedirect } from '@/lib/navigation';

interface FormData {
  firstName: string;
  fatherName: string;
  familyName: string;
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
  dateOfBirth?: string;
  phone?: string;
  profession?: string;
  gender?: string;
  idNumber?: string;
  location?: string;
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    fatherName: '',
    familyName: '',
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
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setMounted(true);

    // Check if user is logged in and profile is incomplete
    const accessToken = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');

    if (!accessToken || !userStr) {
      // Not logged in, redirect to login
      window.location.href = '/login';
      return;
    }

    const userData = JSON.parse(userStr);
    setUser(userData);

    // If profile is already complete, redirect to dashboard
    if (userData.profileComplete) {
      handleLoginRedirect(userData.role);
    }
  }, []);

  const validateForm = (): boolean => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/complete-profile', {
        firstName: formData.firstName,
        fatherName: formData.fatherName,
        familyName: formData.familyName,
        dateOfBirth: formData.dateOfBirth?.toISOString(),
        phone: formData.phone,
        profession: formData.profession,
        gender: formData.gender,
        idNumber: formData.idNumber,
        location: formData.location,
      });

      // Update stored user data
      const updatedUser = { ...user, ...response.data.user, profileComplete: true };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      showSuccess('تم إكمال الملف الشخصي بنجاح');

      // Redirect to appropriate dashboard
      handleLoginRedirect(updatedUser.role);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'فشل إكمال الملف الشخصي';
      setGeneralError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fdfbf7] to-[#f5f0e8]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a3a2f]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#fdfbf7] to-[#f5f0e8]" dir="rtl">
      {/* Watermark pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'url(/islamic-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
        }}
      ></div>

      <div className="w-full max-w-lg relative z-10">
        {/* Form Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-[#c9a227]/10">
          {/* Header */}
          <div className="text-center mb-6">
            <h1
              className="text-3xl font-bold text-[#1a3a2f] mb-2"
              style={{ fontFamily: 'serif' }}
            >
              زاد الهداية
            </h1>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-[1px] bg-[#c9a227]/50"></div>
              <div className="w-1.5 h-1.5 rotate-45 bg-[#c9a227]"></div>
              <div className="w-8 h-[1px] bg-[#c9a227]/50"></div>
            </div>
            <h2 className="text-xl font-bold text-[#1a3a2f]">أكمل ملفك الشخصي</h2>
            <p className="text-gray-500 text-sm mt-2">
              مرحباً {user?.name || user?.email}، يرجى إكمال البيانات التالية للمتابعة
            </p>
          </div>

          {generalError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a3a2f] text-white py-3.5 rounded-xl font-bold hover:bg-[#143026] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl mt-4"
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
                  جاري الحفظ...
                </span>
              ) : (
                'حفظ واستمرار'
              )}
            </button>
          </form>
        </div>

        {/* Bottom quote */}
        <p className="text-center text-[#1a3a2f]/50 text-xs mt-6">
          « العِلْمُ نُورٌ يَقْذِفُهُ اللَّهُ فِي قَلْبِ مَنْ يَشَاءُ »
        </p>
      </div>
    </div>
  );
}
