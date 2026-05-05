'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Modal from './Modal';
import api from '@/lib/api';
import { showSuccess, showError, showWarning } from '@/lib/toast';
import { Search, UserPlus, AlertTriangle } from 'lucide-react';

interface StudentResult {
  id: string;
  name: string;
  email: string;
  idNumber: string | null;
}

interface ManualGradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  onSuccess: () => void;
}

export default function ManualGradeModal({
  isOpen,
  onClose,
  courseId,
  onSuccess,
}: ManualGradeModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [score, setScore] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedStudent(null);
      setScore('');
      setSearching(false);
      setSubmitting(false);
    } else {
      // Load default suggestions (non-enrolled students) when modal opens
      loadDefaultSuggestions();
    }
  }, [isOpen]);

  const loadDefaultSuggestions = useCallback(async () => {
    setSearching(true);
    try {
      const res = await api.get(`/users/search-for-course?courseId=${encodeURIComponent(courseId)}`);
      setSearchResults(res.data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [courseId]);

  const searchStudents = useCallback(async (query: string) => {
    setSearching(true);
    try {
      const url = query.trim().length >= 2
        ? `/users/search-for-course?courseId=${encodeURIComponent(courseId)}&q=${encodeURIComponent(query.trim())}`
        : `/users/search-for-course?courseId=${encodeURIComponent(courseId)}`;
      const res = await api.get(url);
      setSearchResults(res.data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [courseId]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSelectedStudent(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.trim().length === 0) {
      // When cleared, reload default suggestions immediately
      loadDefaultSuggestions();
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchStudents(value);
    }, 300);
  };

  const handleSelectStudent = (student: StudentResult) => {
    setSelectedStudent(student);
    setSearchQuery(student.name);
    setSearchResults([]);
  };

  const handleSubmit = async () => {
    if (!selectedStudent || !score) return;

    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      showError('الدرجة يجب أن تكون بين 0 و 100');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/grades/course/${courseId}/manual-grade`, {
        userId: selectedStudent.id,
        score: scoreNum,
      });

      const data = res.data;

      if (data.enrolled) {
        showSuccess(`تم تسجيل الطالب "${data.student.name}" وإضافة الدرجة ${scoreNum} بنجاح`);
      } else {
        showSuccess(`تم تحديث درجة الطالب "${data.student.name}" إلى ${scoreNum} بنجاح`);
      }

      if (data.prerequisiteWarning) {
        showWarning(data.prerequisiteWarning);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل في إضافة الدرجة');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة درجة نهائية لطالب" size="md">
      <div className="space-y-6">
        {/* Student Search */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2">
            البحث عن طالب
          </label>
          <div className="relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="ابحث بالاسم أو البريد الإلكتروني أو رقم الهوية..."
              className="w-full pr-10 pl-4 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] outline-none transition"
              dir="rtl"
            />
          </div>

          {/* Search Results Dropdown */}
          {!selectedStudent && (searchResults.length > 0 || searching || searchQuery.length >= 2) && (
            <div className="mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {searching ? (
                <div className="p-3 text-center text-stone-500 text-sm">جاري البحث...</div>
              ) : searchResults.length > 0 ? (
                <>
                  {searchQuery.length < 2 && (
                    <div className="px-4 py-2 text-xs text-stone-400 bg-stone-50 border-b border-stone-100 font-medium">
                      طلاب غير مسجلين في الدورة
                    </div>
                  )}
                  {searchResults.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => handleSelectStudent(student)}
                      className="w-full px-4 py-2.5 text-right hover:bg-stone-50 transition border-b border-stone-100 last:border-b-0"
                    >
                      <p className="font-medium text-stone-800 text-sm">{student.name}</p>
                      <p className="text-xs text-stone-500">
                        {student.email}
                        {student.idNumber && ` • ${student.idNumber}`}
                      </p>
                    </button>
                  ))}
                </>
              ) : (
                <div className="p-3 text-center text-stone-500 text-sm">لا توجد نتائج</div>
              )}
            </div>
          )}
        </div>

        {/* Selected Student Card */}
        {selectedStudent && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <UserPlus size={20} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-stone-800 text-sm">{selectedStudent.name}</p>
              <p className="text-xs text-stone-500">
                {selectedStudent.email}
                {selectedStudent.idNumber && ` • ${selectedStudent.idNumber}`}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedStudent(null);
                setSearchQuery('');
              }}
              className="text-xs text-stone-500 hover:text-stone-700 px-2 py-1 rounded hover:bg-stone-100 transition"
            >
              تغيير
            </button>
          </div>
        )}

        {/* Score Input */}
        {selectedStudent && (
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">
              الدرجة النهائية (0 - 100)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="أدخل الدرجة"
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-sm text-center text-lg font-bold focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] outline-none transition"
              dir="ltr"
            />
          </div>
        )}

        {/* Info Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">
            إذا لم يكن الطالب مسجلاً في الدورة، سيتم تسجيله تلقائياً وإضافة الدرجة النهائية.
            إذا كان مسجلاً بالفعل، سيتم تحديث درجته النهائية.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-stone-600 hover:bg-stone-100 rounded-lg transition font-medium text-sm"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedStudent || !score || submitting}
            className="px-5 py-2.5 bg-[#1a3a2f] text-white rounded-lg font-medium text-sm hover:bg-[#134436] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <UserPlus size={16} />
            {submitting ? 'جاري الحفظ...' : 'حفظ الدرجة'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
