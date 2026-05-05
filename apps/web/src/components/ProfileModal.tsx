'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import DatePicker from '@/components/DatePicker';
import GenderSelect from '@/components/GenderSelect';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any; // the logged-in user from auth/me
  onProfileUpdated?: (updatedUser: any) => void;
}

export default function ProfileModal({ isOpen, onClose, user, onProfileUpdated }: ProfileModalProps) {
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  // Edit form state
  const [formData, setFormData] = useState({
    firstName: '',
    fatherName: '',
    familyName: '',
    phone: '',
    dateOfBirth: null as Date | null,
    profession: '',
    gender: '' as string,
    location: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | string[]>('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | string[]>('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  // Load profile when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadProfile();
      setMode('view');
      setSaveError('');
      setSaveSuccess('');
      setPasswordError('');
      setPasswordSuccess('');
      setShowPasswordSection(false);
    }
  }, [isOpen, user]);

  const loadProfile = async () => {
    setProfileLoading(true);
    try {
      const response = await api.get(`/users/${user.id}/profile`);
      setProfileData(response.data);
      // Pre-populate form with current data
      const p = response.data;
      setFormData({
        firstName: p.firstName || '',
        fatherName: p.fatherName || '',
        familyName: p.familyName || '',
        phone: p.phone || '',
        dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : null,
        profession: p.profession || '',
        gender: p.gender || '',
        location: p.location || '',
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      // Only send fields that have values
      const payload: any = {};
      if (formData.firstName) payload.firstName = formData.firstName;
      if (formData.fatherName) payload.fatherName = formData.fatherName;
      if (formData.familyName) payload.familyName = formData.familyName;
      if (formData.phone) payload.phone = formData.phone;
      if (formData.dateOfBirth) payload.dateOfBirth = formData.dateOfBirth.toISOString();
      if (formData.profession) payload.profession = formData.profession;
      if (formData.gender) payload.gender = formData.gender;
      if (formData.location) payload.location = formData.location;

      const response = await api.put('/users/me/profile', payload);
      setSaveSuccess('تم تحديث الملف الشخصي بنجاح');

      // Refresh profile data
      await loadProfile();

      // Notify parent to update user state (name may have changed)
      if (onProfileUpdated && response.data.user) {
        onProfileUpdated(response.data.user);
      }

      // Switch back to view mode after brief delay
      setTimeout(() => {
        setMode('view');
        setSaveSuccess('');
      }, 1500);
    } catch (error: any) {
      const data = error.response?.data;
      if (data?.errors?.length) {
        setSaveError(data.errors.map((e: any) => e.message));
      } else {
        setSaveError(data?.message || 'فشل تحديث الملف الشخصي');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('كلمة المرور الجديدة وتأكيدها غير متطابقتين');
      setPasswordSaving(false);
      return;
    }

    try {
      await api.put('/users/me/password', passwordData);
      setPasswordSuccess('تم تغيير كلمة المرور بنجاح');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordSection(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (error: any) {
      const data = error.response?.data;
      if (data?.errors?.length) {
        setPasswordError(data.errors.map((e: any) => e.message));
      } else {
        setPasswordError(data?.message || 'فشل تغيير كلمة المرور');
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleClose = () => {
    setMode('view');
    setProfileData(null);
    setSaveError('');
    setSaveSuccess('');
    setPasswordError('');
    setPasswordSuccess('');
    setShowPasswordSection(false);
    onClose();
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      ADMIN: 'bg-purple-100 text-purple-800',
      TEACHER: 'bg-blue-100 text-blue-800',
      STUDENT: 'bg-green-100 text-green-800',
    };
    const labels: Record<string, string> = {
      ADMIN: 'مشرف',
      TEACHER: 'مدرس',
      STUDENT: 'طالب',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${styles[role] || styles.STUDENT}`}>
        {labels[role] || 'طالب'}
      </span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'view' ? 'الملف الشخصي' : 'تعديل الملف الشخصي'}
      size="lg"
    >
      {profileLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div>
        </div>
      ) : profileData ? (
        mode === 'view' ? (
          /* ============ VIEW MODE ============ */
          <div className="space-y-6">
            {/* Header with edit button */}
            <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white font-bold text-3xl shrink-0">
                {profileData.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold text-gray-800">{profileData.name}</h3>
                <p className="text-lg text-gray-600">{profileData.email}</p>
                <div className="flex gap-2 mt-2">
                  {getRoleBadge(profileData.role)}
                  {profileData.provider && (
                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
                      {profileData.provider === 'GOOGLE' ? 'Google' : profileData.provider === 'APPLE' ? 'Apple' : 'Email'}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setMode('edit')}
                className="shrink-0 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                تعديل
              </button>
            </div>

            {/* Personal Info */}
            {(profileData.firstName || profileData.phone || profileData.dateOfBirth) && (
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-3">المعلومات الشخصية</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-700">
                  {profileData.firstName && (
                    <p><span className="font-semibold">الاسم:</span> {profileData.firstName} {profileData.fatherName} {profileData.familyName}</p>
                  )}
                  {profileData.phone && (
                    <p><span className="font-semibold">الهاتف:</span> {profileData.phone}</p>
                  )}
                  {profileData.dateOfBirth && (
                    <p><span className="font-semibold">تاريخ الولادة:</span> {formatDate(profileData.dateOfBirth)}</p>
                  )}
                  {profileData.profession && (
                    <p><span className="font-semibold">المهنة:</span> {profileData.profession}</p>
                  )}
                  {profileData.gender && (
                    <p><span className="font-semibold">الفئة:</span> {profileData.gender === 'MALE' ? 'أخوة' : 'أخوات'}</p>
                  )}
                  {profileData.location && (
                    <p><span className="font-semibold">الموقع:</span> {profileData.location}</p>
                  )}
                </div>
              </div>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {profileData._count?.enrollments !== undefined && (
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <p className="text-sm text-blue-600 font-semibold">التسجيلات</p>
                  <p className="text-2xl font-bold text-blue-800">{profileData._count.enrollments}</p>
                </div>
              )}
              {profileData._count?.examAttempts !== undefined && (
                <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                  <p className="text-sm text-green-600 font-semibold">الامتحانات</p>
                  <p className="text-2xl font-bold text-green-800">{profileData._count.examAttempts}</p>
                </div>
              )}
              {profileData._count?.homeworkSubmissions !== undefined && (
                <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
                  <p className="text-sm text-yellow-600 font-semibold">الواجبات</p>
                  <p className="text-2xl font-bold text-yellow-800">{profileData._count.homeworkSubmissions}</p>
                </div>
              )}
              {profileData._count?.coursesTaught !== undefined && profileData._count.coursesTaught > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <p className="text-sm text-blue-600 font-semibold">الدورات</p>
                  <p className="text-2xl font-bold text-blue-800">{profileData._count.coursesTaught}</p>
                </div>
              )}
            </div>

            {/* Enrollments */}
            {profileData.enrollments && profileData.enrollments.length > 0 && (
              <div>
                <h4 className="text-xl font-bold text-gray-800 mb-4">الدورات المسجلة</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profileData.enrollments.map((enrollment: any) => (
                    <div key={enrollment.id} className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                      <h5 className="font-semibold text-gray-800">{enrollment.course.title}</h5>
                      <p className="text-sm text-gray-600 mt-1">
                        تاريخ التسجيل: {formatDate(enrollment.enrolledAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Courses Taught */}
            {profileData.coursesTaught && profileData.coursesTaught.length > 0 && (
              <div>
                <h4 className="text-xl font-bold text-gray-800 mb-4">الدورات التي أدرسها</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profileData.coursesTaught.map((course: any) => (
                    <div key={course.id} className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                      <h5 className="font-semibold text-gray-800">{course.title}</h5>
                      <p className="text-sm text-gray-600 mt-1">
                        الطلاب: {course._count?.enrollments || 0}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Account Info */}
            <div className="pt-6 border-t border-gray-200">
              <h4 className="text-lg font-bold text-gray-800 mb-3">معلومات الحساب</h4>
              <div className="space-y-2 text-gray-700">
                <p><span className="font-semibold">تاريخ الإنشاء:</span> {formatDate(profileData.createdAt)}</p>
                <p><span className="font-semibold">الحالة:</span> {profileData.blocked ? 'محظور' : 'نشط'}</p>
              </div>
            </div>
          </div>
        ) : (
          /* ============ EDIT MODE ============ */
          <div className="space-y-6">
            {/* Back to view button */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
              <button
                onClick={() => { setMode('view'); setSaveError(''); setSaveSuccess(''); }}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors text-sm"
              >
                <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                العودة للملف الشخصي
              </button>
            </div>

            {/* Profile Edit Form */}
            <form onSubmit={handleSaveProfile}>
              <h4 className="text-lg font-bold text-gray-800 mb-4">المعلومات الشخصية</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الشخصي</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-800"
                    placeholder="الاسم الشخصي"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم الوالد</label>
                  <input
                    type="text"
                    value={formData.fatherName}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-800"
                    placeholder="اسم الوالد"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم العائلة</label>
                  <input
                    type="text"
                    value={formData.familyName}
                    onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-800"
                    placeholder="اسم العائلة"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-800"
                    placeholder="رقم الهاتف"
                    dir="ltr"
                  />
                </div>
                <DatePicker
                  label="تاريخ الولادة"
                  value={formData.dateOfBirth}
                  onChange={(date) => setFormData({ ...formData, dateOfBirth: date })}
                  maxDate={new Date()}
                  minDate={new Date('1900-01-01')}
                  placeholder="اختر تاريخ الولادة"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المهنة</label>
                  <input
                    type="text"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-800"
                    placeholder="المهنة"
                  />
                </div>
                <GenderSelect
                  label="الفئة"
                  value={formData.gender}
                  onChange={(value) => setFormData({ ...formData, gender: value })}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الموقع / البلد</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-800"
                    placeholder="الموقع / البلد"
                  />
                </div>
              </div>

              {/* Email display (read-only) */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">لا يمكن تغيير البريد الإلكتروني</p>
              </div>

              {saveError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {Array.isArray(saveError) ? (
                    <ul className="list-disc list-inside space-y-1">
                      {saveError.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  ) : saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                  {saveSuccess}
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('view'); setSaveError(''); setSaveSuccess(''); }}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  إلغاء
                </button>
              </div>
            </form>

            {/* Password Change Section */}
            <div className="pt-6 border-t border-gray-200">
              {!showPasswordSection ? (
                <button
                  onClick={() => setShowPasswordSection(true)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  تغيير كلمة المرور
                </button>
              ) : (
                <form onSubmit={handleChangePassword}>
                  <h4 className="text-lg font-bold text-gray-800 mb-4">تغيير كلمة المرور</h4>

                  <div className="space-y-4 max-w-md">
                    {/* Only show current password if user has one (not first-time OAuth) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الحالية</label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-800"
                        placeholder="كلمة المرور الحالية"
                        required
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الجديدة</label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-800"
                        placeholder="6 أحرف على الأقل"
                        minLength={6}
                        required
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">تأكيد كلمة المرور الجديدة</label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-800"
                        placeholder="أعد كتابة كلمة المرور الجديدة"
                        minLength={6}
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {passwordError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                      {Array.isArray(passwordError) ? (
                        <ul className="list-disc list-inside space-y-1">
                          {passwordError.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                      ) : passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                      {passwordSuccess}
                    </div>
                  )}

                  <div className="mt-4 flex gap-3">
                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {passwordSaving ? 'جارٍ التغيير...' : 'تغيير كلمة المرور'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordSection(false);
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        setPasswordError('');
                        setPasswordSuccess('');
                      }}
                      className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="p-6 text-center text-gray-500">
          <p>فشل تحميل بيانات الملف الشخصي</p>
        </div>
      )}
    </Modal>
  );
}
