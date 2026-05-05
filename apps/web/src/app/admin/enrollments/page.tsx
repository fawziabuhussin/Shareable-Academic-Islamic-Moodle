'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { UsersIcon, BookIcon, CalendarIcon, FilterIcon, SearchIcon } from '@/components/Icons';
import { showSuccess, showError, TOAST_MESSAGES } from '@/lib/toast';
import { Pagination, PaginationInfo, PaginatedResponse } from '@/components/Pagination';
import PageLoading from '@/components/PageLoading';
import { formatDate } from '@/lib/utils';

function StatusFilterDropdown({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const options = [
    { value: '', label: 'جميع الحالات' },
    { value: 'ACTIVE', label: 'نشط' },
    { value: 'PENDING', label: 'قيد الانتظار' },
    { value: 'CANCELED', label: 'ملغي' },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-gray-800 bg-white text-right flex items-center justify-between min-w-[200px]"
      >
        <span>{options.find((o) => o.value === value)?.label || 'جميع الحالات'}</span>
        <svg
          className={`w-4 h-4 transition-transform ${dropdownOpen ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdownOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
          <div className="absolute z-20 mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg min-w-[200px]" style={{ direction: 'rtl' }}>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setDropdownOpen(false);
                }}
                className={`w-full text-right px-4 py-2 text-sm hover:bg-gray-100 transition ${
                  value === option.value ? 'bg-primary text-white' : 'text-gray-800'
                } ${option.value !== '' ? 'border-t border-gray-200' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface Enrollment {
  id: string;
  status: string;
  enrolledAt: string;
  user: { id?: string; name: string; email: string };
  course: { id?: string; title: string };
}

interface CourseOption {
  id: string;
  title: string;
}

interface UserPick {
  id: string;
  name: string;
  email: string;
}

type EnrollmentsListResponse = PaginatedResponse<Enrollment> & {
  stats: { active: number; pending: number; canceled: number };
};

const ITEMS_PER_PAGE = 15;

export default function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEnrollments, setTotalEnrollments] = useState(0);
  const [stats, setStats] = useState({ active: 0, pending: 0, canceled: 0 });

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [courseId, setCourseId] = useState('');
  const [courses, setCourses] = useState<CourseOption[]>([]);

  const [filterUserId, setFilterUserId] = useState('');
  const [filterUserLabel, setFilterUserLabel] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<UserPick[]>([]);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const userPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filtersKeyRef = useRef<string | null>(null);
  const [listVersion, setListVersion] = useState(0);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (userPickerRef.current && !userPickerRef.current.contains(e.target as Node)) {
        setUserPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    api
      .get('/courses/admin', { params: { page: 1, limit: 500, sortBy: 'title', sortOrder: 'asc' } })
      .then((res) => {
        const data = res.data as PaginatedResponse<{ id: string; title: string }>;
        setCourses((data.data || []).map((c) => ({ id: c.id, title: c.title })));
      })
      .catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    const q = userQuery.trim();
    if (q.length < 2) {
      setUserResults([]);
      setUserSearchLoading(false);
      return;
    }
    setUserSearchLoading(true);
    const t = setTimeout(() => {
      api
        .get('/users', { params: { page: 1, limit: 25, search: q } })
        .then((res) => {
          const data = res.data as PaginatedResponse<UserPick>;
          setUserResults(data.data || []);
        })
        .catch(() => setUserResults([]))
        .finally(() => setUserSearchLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [userQuery]);

  useEffect(() => {
    const filtersKey = JSON.stringify({
      debouncedSearch,
      courseId,
      filterUserId,
      statusFilter,
    });
    if (
      filtersKeyRef.current !== null &&
      filtersKeyRef.current !== filtersKey &&
      currentPage !== 1
    ) {
      filtersKeyRef.current = filtersKey;
      setCurrentPage(1);
      return;
    }
    filtersKeyRef.current = filtersKey;

    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const params: Record<string, string | number> = {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
        };
        if (debouncedSearch) params.search = debouncedSearch;
        if (courseId) params.courseId = courseId;
        if (filterUserId) params.userId = filterUserId;
        if (statusFilter) params.status = statusFilter;

        const response = await api.get('/enrollments', { params, signal: ac.signal });
        const data = response.data as EnrollmentsListResponse;
        setEnrollments(data.data || []);
        setTotalPages(data.pagination?.totalPages ?? 0);
        setTotalEnrollments(data.pagination?.total || 0);
        if (data.stats) {
          setStats(data.stats);
        }
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_CANCELED') {
          return;
        }
        if (error && typeof error === 'object' && 'name' in error && error.name === 'CanceledError') {
          return;
        }
        console.error('Failed to load enrollments:', error);
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => ac.abort();
  }, [currentPage, debouncedSearch, courseId, filterUserId, statusFilter, listVersion]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/enrollments/${id}`, { status: newStatus });
      setEnrollments(enrollments.map((e) => (e.id === id ? { ...e, status: newStatus } : e)));
      showSuccess(TOAST_MESSAGES.UPDATE_SUCCESS);
      setListVersion((v) => v + 1);
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل تحديث التسجيل');
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setCourseId('');
    setFilterUserId('');
    setFilterUserLabel('');
    setUserQuery('');
    setUserResults([]);
    setStatusFilter('');
    setUserPickerOpen(false);
  };

  const hasActiveFilters =
    !!debouncedSearch || !!courseId || !!filterUserId || !!statusFilter;

  if (loading && enrollments.length === 0) {
    return <PageLoading title="التسجيلات" icon={<UsersIcon size={24} />} />;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <UsersIcon size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">إدارة التسجيلات</h1>
              <p className="text-white/70 text-sm">{totalEnrollments} تسجيل (حسب المرشحات الحالية)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <p className="text-2xl font-bold text-[#1a3a2f]">{totalEnrollments}</p>
            <p className="text-sm text-stone-500">إجمالي النتائج</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
            <p className="text-sm text-stone-500">نشطة</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-sm text-stone-500">قيد الانتظار</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <p className="text-2xl font-bold text-red-600">{stats.canceled}</p>
            <p className="text-sm text-stone-500">ملغية</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4 mb-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <FilterIcon size={18} className="text-stone-400 shrink-0" />
            <span className="text-sm font-medium text-stone-700">مرشحات ذكية</span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-[#1a3a2f] underline hover:text-[#c9a227] mr-auto"
              >
                مسح الكل
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-xs font-medium text-stone-500 mb-1">بحث سريع (اسم الطالب، البريد، أو عنوان الدورة)</label>
              <div className="relative">
                <SearchIcon size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="مثال: أحمد، gmail، تفسير..."
                  className="w-full pr-10 pl-3 py-2.5 border border-stone-200 rounded-lg text-stone-800 text-sm focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f]"
                  dir="rtl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">الدورة</label>
              <div className="relative flex items-center gap-2">
                <BookIcon size={18} className="text-stone-400 shrink-0 hidden sm:block" />
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full py-2.5 px-3 border border-stone-200 rounded-lg text-stone-800 text-sm bg-white focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f]"
                >
                  <option value="">كل الدورات</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 items-start">
            <div ref={userPickerRef} className="relative w-full sm:w-auto sm:min-w-[280px]">
              <label className="block text-xs font-medium text-stone-500 mb-1">مستخدم محدد</label>
              {filterUserId ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-2 px-3 py-2 bg-stone-100 rounded-lg text-sm text-stone-800">
                    {filterUserLabel}
                    <button
                      type="button"
                      onClick={() => {
                        setFilterUserId('');
                        setFilterUserLabel('');
                        setUserQuery('');
                      }}
                      className="text-stone-500 hover:text-red-600 font-bold leading-none"
                      aria-label="إزالة تصفية المستخدم"
                    >
                      ×
                    </button>
                  </span>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => {
                      setUserQuery(e.target.value);
                      setUserPickerOpen(true);
                    }}
                    onFocus={() => setUserPickerOpen(true)}
                    placeholder="اكتب حرفين للبحث عن مستخدم..."
                    className="w-full py-2.5 px-3 border border-stone-200 rounded-lg text-stone-800 text-sm focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f]"
                    dir="rtl"
                  />
                  {userPickerOpen && (userQuery.trim().length >= 2 || userSearchLoading) && (
                    <div
                      className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-stone-200 rounded-lg shadow-lg"
                      style={{ direction: 'rtl' }}
                    >
                      {userSearchLoading && userResults.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-stone-500">جاري البحث...</p>
                      ) : userResults.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-stone-500">لا نتائج</p>
                      ) : (
                        userResults.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setFilterUserId(u.id);
                              setFilterUserLabel(`${u.name} (${u.email})`);
                              setUserQuery('');
                              setUserResults([]);
                              setUserPickerOpen(false);
                            }}
                            className="w-full text-right px-3 py-2 text-sm hover:bg-stone-50 border-b border-stone-50 last:border-0"
                          >
                            <span className="font-medium text-stone-800 block">{u.name}</span>
                            <span className="text-xs text-stone-500">{u.email}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-end">
              <StatusFilterDropdown value={statusFilter} onChange={setStatusFilter} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
          {enrollments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UsersIcon size={32} className="text-stone-400" />
              </div>
              <p className="text-stone-500 text-lg">لا توجد تسجيلات تطابق المرشحات</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">الطالب</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider hidden md:table-cell">الدورة</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">الحالة</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider hidden sm:table-cell">تاريخ التسجيل</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {enrollments.map((enrollment) => (
                      <tr key={enrollment.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <h3 className="font-semibold text-stone-800">{enrollment.user.name}</h3>
                            <p className="text-sm text-stone-500">{enrollment.user.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600 hidden md:table-cell">{enrollment.course.title}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                              enrollment.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-700'
                                : enrollment.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {enrollment.status === 'ACTIVE' ? 'نشط' : enrollment.status === 'PENDING' ? 'قيد الانتظار' : 'ملغي'}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <div className="flex items-center gap-1 text-stone-500 text-sm">
                            <CalendarIcon size={14} />
                            {formatDate(enrollment.enrolledAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={enrollment.status}
                            onChange={(e) => handleStatusChange(enrollment.id, e.target.value)}
                            className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] text-stone-700 bg-white"
                          >
                            <option value="ACTIVE">نشط</option>
                            <option value="PENDING">قيد الانتظار</option>
                            <option value="CANCELED">إلغاء</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && totalEnrollments > 0 && (
                <div className="px-6 py-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <PaginationInfo currentPage={currentPage} limit={ITEMS_PER_PAGE} total={totalEnrollments} itemName="تسجيل" />
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
