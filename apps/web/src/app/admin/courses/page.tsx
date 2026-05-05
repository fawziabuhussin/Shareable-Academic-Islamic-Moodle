'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { BookIcon, PlusIcon, SearchIcon, GraduateIcon, FilterIcon, ChevronDownIcon, SparkleIcon } from '@/components/Icons';
import CourseThumbnail from '@/components/CourseThumbnail';
import { showSuccess, showError, TOAST_MESSAGES } from '@/lib/toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useConfirmDialog } from '@/lib/useConfirmDialog';
import { Pagination, PaginationInfo, PaginatedResponse } from '@/components/Pagination';
import Tooltip from '@/components/Tooltip';
import PageLoading from '@/components/PageLoading';

interface Course {
  id: string;
  title: string;
  description: string | null;
  coverImage?: string;
  status: string;
  lifecycle?: string;
  price?: number;
  category: { id: string; title: string };
  teacher: { name: string };
  _count: { enrollments: number };
  createdAt: string;
}

interface Category {
  id: string;
  title: string;
}

interface Teacher {
  id: string;
  name: string;
}

type SortField = 'title' | 'category' | 'teacher' | 'status' | 'enrollments' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 10;

// ─── Sort Icon ──────────────────────────────────────────────
function SortIndicator({ field, activeField, order }: { field: SortField; activeField?: SortField; order: SortOrder }) {
  const isActive = field === activeField;
  return (
    <span className="inline-flex flex-col mr-1 leading-none">
      <svg width="8" height="5" viewBox="0 0 8 5" className={`mb-px ${isActive && order === 'asc' ? 'text-[#c9a227]' : 'text-stone-300'}`}>
        <path d="M4 0L8 5H0L4 0Z" fill="currentColor" />
      </svg>
      <svg width="8" height="5" viewBox="0 0 8 5" className={`${isActive && order === 'desc' ? 'text-[#c9a227]' : 'text-stone-300'}`}>
        <path d="M4 5L0 0H8L4 5Z" fill="currentColor" />
      </svg>
    </span>
  );
}

// ─── Column Filter Dropdown ─────────────────────────────────
function ColumnFilterDropdown({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = value !== '';

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={`p-0.5 rounded transition ${isActive ? 'text-[#c9a227]' : 'text-stone-400 hover:text-stone-600'}`}
        title={`تصفية ${label}`}
      >
        <FilterIcon size={13} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-stone-200 rounded-lg shadow-lg py-1 min-w-[160px]">
          <button
            onClick={() => { onChange(''); setOpen(false); }}
            className={`w-full text-right px-3 py-1.5 text-sm hover:bg-stone-50 transition ${value === '' ? 'text-[#c9a227] font-semibold' : 'text-stone-700'}`}
          >
            الكل
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-right px-3 py-1.5 text-sm hover:bg-stone-50 transition ${value === opt.value ? 'text-[#c9a227] font-semibold' : 'text-stone-700'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sortable Column Header ────────────────────────────────
function SortableHeader({
  field,
  label,
  sortBy,
  sortOrder,
  onSort,
  filterNode,
  className = '',
}: {
  field: SortField;
  label: string;
  sortBy?: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  filterNode?: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider ${className}`}>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onSort(field)}
          className="flex items-center gap-1 hover:text-stone-900 transition group"
        >
          <SortIndicator field={field} activeField={sortBy} order={sortOrder} />
          <span>{label}</span>
        </button>
        {filterNode}
      </div>
    </th>
  );
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State from URL
  const initialPage = parseInt(searchParams.get('page') || '1');
  const initialSearch = searchParams.get('search') || '';
  const initialStatus = searchParams.get('status') || '';
  const initialCategoryId = searchParams.get('categoryId') || '';
  const initialTeacherId = searchParams.get('teacherId') || '';
  const initialSortBy = (searchParams.get('sortBy') as SortField) || undefined;
  const initialSortOrder = (searchParams.get('sortOrder') as SortOrder) || 'desc';

  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCourses, setTotalCourses] = useState(0);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [categoryFilter, setCategoryFilter] = useState(initialCategoryId);
  const [teacherFilter, setTeacherFilter] = useState(initialTeacherId);
  const [sortBy, setSortBy] = useState<SortField | undefined>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);
  const { confirm, isOpen: confirmOpen, options: confirmOptions, handleConfirm, handleClose: handleConfirmClose } = useConfirmDialog();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load categories and teachers once
  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data || [])).catch(() => {});
    api.get('/users/teachers').then((res) => setTeachers(res.data || [])).catch(() => {});
  }, []);

  // Sync URL params
  const updateUrl = useCallback((params: Record<string, string | undefined>) => {
    const url = new URLSearchParams();
    const merged = {
      page: String(currentPage),
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      categoryId: categoryFilter || undefined,
      teacherId: teacherFilter || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortBy ? sortOrder : undefined,
      ...params,
    };
    Object.entries(merged).forEach(([k, v]) => { if (v) url.set(k, v); });
    router.replace(`/admin/courses?${url.toString()}`, { scroll: false });
  }, [currentPage, debouncedSearch, statusFilter, categoryFilter, teacherFilter, sortBy, sortOrder, router]);

  // Load courses when filters / page change
  useEffect(() => {
    loadCourses();
  }, [currentPage, debouncedSearch, statusFilter, categoryFilter, teacherFilter, sortBy, sortOrder]);

  // Update URL when state changes (except initial load)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    updateUrl({});
  }, [currentPage, debouncedSearch, statusFilter, categoryFilter, teacherFilter, sortBy, sortOrder]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page: currentPage, limit: ITEMS_PER_PAGE };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (teacherFilter) params.teacherId = teacherFilter;
      if (sortBy) { params.sortBy = sortBy; params.sortOrder = sortOrder; }

      const response = await api.get('/courses/admin', { params });
      const data = response.data as PaginatedResponse<Course>;
      setCourses(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCourses(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ message: 'هل أنت متأكد من حذف هذه الدورة؟', title: 'حذف الدورة', variant: 'danger' });
    if (!ok) return;

    try {
      await api.delete(`/courses/${id}`);
      showSuccess(TOAST_MESSAGES.DELETE_SUCCESS);
      loadCourses();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل حذف الدورة');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      // Cycle: asc → desc → none
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortBy(undefined);
        setSortOrder('desc');
      }
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value);
    setCurrentPage(1);
  };

  const handleTeacherFilter = (value: string) => {
    setTeacherFilter(value);
    setCurrentPage(1);
  };

  // Stats
  const stats = {
    total: totalCourses,
    published: courses.filter(c => c.status === 'PUBLISHED').length,
    draft: courses.filter(c => c.status === 'DRAFT').length,
    totalStudents: courses.reduce((sum, c) => sum + (c._count?.enrollments || 0), 0),
  };

  // Active filter count (for visual indicator)
  const activeFilterCount = [statusFilter, categoryFilter, teacherFilter, debouncedSearch].filter(Boolean).length;

  if (loading && courses.length === 0 && !debouncedSearch && !statusFilter && !categoryFilter && !teacherFilter) {
    return <PageLoading title="الدورات" icon={<BookIcon size={24} />} />;
  }

  // Category filter options
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.title }));

  // Status filter options
  const statusOptions = [
    { value: 'PUBLISHED', label: 'منشور' },
    { value: 'DRAFT', label: 'مسودة' },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <BookIcon size={24} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">إدارة الدورات</h1>
                <p className="text-white/70 text-sm">{stats.total} دورة</p>
              </div>
            </div>
            <Link
              href="/admin/courses/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#c9a227] text-white rounded-xl font-bold hover:bg-[#b08f20] transition-all shadow-lg"
            >
              <PlusIcon size={18} />
              دورة جديدة
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <p className="text-2xl font-bold text-[#1a3a2f]">{stats.total}</p>
            <p className="text-sm text-stone-500">إجمالي الدورات</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <p className="text-2xl font-bold text-emerald-600">{stats.published}</p>
            <p className="text-sm text-stone-500">منشورة</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <p className="text-2xl font-bold text-stone-500">{stats.draft}</p>
            <p className="text-sm text-stone-500">مسودات</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <p className="text-2xl font-bold text-sky-600">{stats.totalStudents}</p>
            <p className="text-sm text-stone-500">إجمالي التسجيلات</p>
          </div>
        </div>

        {/* Search + Active Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4 mb-6 space-y-3">
          <div className="relative">
            <SearchIcon size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="ابحث عن دورة..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pr-10 pl-4 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] text-stone-800 bg-white transition-all"
            />
          </div>
          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {statusFilter && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 text-sm font-medium">
                  الحالة: {statusFilter === 'PUBLISHED' ? 'منشور' : 'مسودة'}
                  <button onClick={() => handleStatusFilter('')} className="mr-1 hover:text-amber-600">×</button>
                </span>
              )}
              {categoryFilter && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 text-sm font-medium">
                  الفئة: {categories.find(c => c.id === categoryFilter)?.title || 'مختارة'}
                  <button onClick={() => handleCategoryFilter('')} className="mr-1 hover:text-amber-600">×</button>
                </span>
              )}
              {teacherFilter && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 text-sm font-medium">
                  المدرس: {teachers.find(t => t.id === teacherFilter)?.name || 'مختار'}
                  <button onClick={() => handleTeacherFilter('')} className="mr-1 hover:text-amber-600">×</button>
                </span>
              )}
              {debouncedSearch && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 text-sm font-medium">
                  بحث: {debouncedSearch}
                  <button onClick={() => { setSearch(''); setCurrentPage(1); }} className="mr-1 hover:text-amber-600">×</button>
                </span>
              )}
              <button
                onClick={() => { setSearch(''); setStatusFilter(''); setCategoryFilter(''); setTeacherFilter(''); setCurrentPage(1); }}
                className="text-sm text-stone-500 hover:text-stone-700 transition"
              >
                مسح الكل
              </button>
            </div>
          )}
        </div>

        {/* Courses Table */}
        <div className={`bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {courses.length === 0 && !loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookIcon size={32} className="text-stone-400" />
              </div>
              <p className="text-stone-500 text-lg mb-4">
                {activeFilterCount > 0 ? 'لا توجد دورات مطابقة للبحث' : 'لا توجد دورات'}
              </p>
              {activeFilterCount > 0 ? (
                <button
                  onClick={() => { setSearch(''); setStatusFilter(''); setCategoryFilter(''); setTeacherFilter(''); setCurrentPage(1); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-100 text-stone-700 rounded-xl font-bold hover:bg-stone-200 transition"
                >
                  مسح التصفية
                </button>
              ) : (
                <Link
                  href="/admin/courses/create"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a3a2f] text-white rounded-xl font-bold hover:bg-[#143026] transition"
                >
                  <PlusIcon size={18} />
                  إنشاء دورة جديدة
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <SortableHeader field="title" label="الدورة" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                      <SortableHeader
                        field="category"
                        label="الفئة"
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                        className="hidden md:table-cell"
                        filterNode={
                          <ColumnFilterDropdown
                            options={categoryOptions}
                            value={categoryFilter}
                            onChange={handleCategoryFilter}
                            label="الفئة"
                          />
                        }
                      />
                      <SortableHeader
                        field="teacher"
                        label="المدرس"
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                        className="hidden lg:table-cell"
                        filterNode={
                          <ColumnFilterDropdown
                            options={teachers.map(t => ({ value: t.id, label: t.name }))}
                            value={teacherFilter}
                            onChange={handleTeacherFilter}
                            label="المدرس"
                          />
                        }
                      />
                      <SortableHeader
                        field="status"
                        label="الحالة"
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                        filterNode={
                          <ColumnFilterDropdown
                            options={statusOptions}
                            value={statusFilter}
                            onChange={handleStatusFilter}
                            label="الحالة"
                          />
                        }
                      />
                      <SortableHeader field="enrollments" label="التسجيلات" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="hidden sm:table-cell" />
                      <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {courses.map((course) => (
                      <tr key={course.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <CourseThumbnail src={course.coverImage} title={course.title} />
                            <div>
                              <h3 className="font-semibold text-stone-800 line-clamp-1">{course.title}</h3>
                              {course.description && <p className="text-sm text-stone-500 line-clamp-1 hidden sm:block">{course.description}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600 hidden md:table-cell">{course.category?.title || 'بدون فئة'}</td>
                        <td className="px-6 py-4 text-sm text-stone-600 hidden lg:table-cell">{course.teacher?.name || 'غير محدد'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                              course.status === 'PUBLISHED' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-stone-100 text-stone-600'
                            }`}>
                              {course.status === 'PUBLISHED' ? 'منشور' : 'مسودة'}
                            </span>
                            {course.lifecycle === 'ONGOING' && (
                              <Tooltip text="هذه الدورة تقام وجاهيّاً ويتم إضافة الدروس والمواد فور تسجيلها">
                                <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-violet-100 text-violet-700">
                                  <SparkleIcon size={12} />
                                  وجاهي
                                </span>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <div className="flex items-center gap-1 text-stone-600">
                            <GraduateIcon size={14} />
                            <span className="text-sm font-medium">{course._count?.enrollments || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Link
                              href={`/admin/courses/${course.id}/edit`}
                              className="px-3 py-1.5 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100 transition text-sm font-medium"
                            >
                              تعديل
                            </Link>
                            <button
                              onClick={() => handleDelete(course.id)}
                              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <PaginationInfo
                    currentPage={currentPage}
                    limit={ITEMS_PER_PAGE}
                    total={totalCourses}
                    itemName="دورة"
                  />
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <ConfirmDialog isOpen={confirmOpen} onClose={handleConfirmClose} onConfirm={handleConfirm} {...confirmOptions} />
    </div>
  );
}

