'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Modal from '@/components/Modal';
import { UsersIcon, PlusIcon, EditIcon, TrashIcon, EyeIcon, EyeOffIcon, SearchIcon, FilterIcon } from '@/components/Icons';
import { showSuccess, showError, TOAST_MESSAGES } from '@/lib/toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useConfirmDialog } from '@/lib/useConfirmDialog';
import { formatDate } from '@/lib/utils';
import { Pagination, PaginationInfo } from '@/components/Pagination';
import PageLoading from '@/components/PageLoading';
import DatePicker from '@/components/DatePicker';
import GenderSelect from '@/components/GenderSelect';
import { Download } from 'lucide-react';
import { exportUsersToExcel } from '@/lib/excelExport';

// ─── Sort Indicator ──────────────────────────────────────────
type SortField = 'name' | 'role' | 'status' | 'gender' | 'createdAt';
type SortOrder = 'asc' | 'desc';

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

// ─── Sortable Column Header ─────────────────────────────────
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

interface User {
  id: string;
  name: string;
  firstName?: string;
  fatherName?: string;
  familyName?: string;
  email: string;
  role: string;
  blocked: boolean;
  dateOfBirth?: string;
  phone?: string;
  profession?: string;
  gender?: string;
  idNumber?: string;
  location?: string;
  createdAt: string;
  _count: {
    coursesTaught?: number;
    enrollments?: number;
  };
}

const ITEMS_PER_PAGE = 15;

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get('action');

  // State from URL
  const initialPage = parseInt(searchParams.get('page') || '1');
  const initialSearch = searchParams.get('search') || '';
  const initialRole = searchParams.get('role') || '';
  const initialGender = searchParams.get('gender') || '';
  const initialBlocked = searchParams.get('blocked') || '';
  const initialSortBy = (searchParams.get('sortBy') as SortField) || undefined;
  const initialSortOrder = (searchParams.get('sortOrder') as SortOrder) || 'desc';

  const [allUsers, setAllUsers] = useState<User[]>([]); // full list from API
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [roleFilter, setRoleFilter] = useState(initialRole);
  const [genderFilter, setGenderFilter] = useState(initialGender);
  const [blockedFilter, setBlockedFilter] = useState(initialBlocked);
  const [sortBy, setSortBy] = useState<SortField | undefined>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    fatherName: '',
    familyName: '',
    dateOfBirth: null as Date | null,
    phone: '',
    profession: '',
    gender: '' as 'MALE' | 'FEMALE' | '',
    idNumber: '',
    location: '',
    password: '',
  });
  const [showCreateForm, setShowCreateForm] = useState(action === 'create');
  const [createFormData, setCreateFormData] = useState({
    firstName: '',
    fatherName: '',
    familyName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'STUDENT' as 'ADMIN' | 'TEACHER' | 'STUDENT',
    dateOfBirth: null as Date | null,
    phone: '',
    profession: '',
    gender: '' as 'MALE' | 'FEMALE' | '',
    idNumber: '',
    location: '',
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showCreateConfirmPassword, setShowCreateConfirmPassword] = useState(false);
  const [createErrors, setCreateErrors] = useState<{ [key: string]: string }>({});
  const [editErrors, setEditErrors] = useState<{ [key: string]: string }>({});
  const [viewingProfile, setViewingProfile] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const { confirm, isOpen: confirmOpen, options: confirmOptions, handleConfirm, handleClose: handleConfirmClose } = useConfirmDialog();
  const [syncCheckUser, setSyncCheckUser] = useState<User | null>(null);
  const [syncData, setSyncData] = useState<{
    totalOldGrades: number;
    syncedCount: number;
    unsyncedCount: number;
    details: Array<{ courseNumber: string; courseId: string; finalGrade: number; synced: boolean }>;
  } | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [syncingCourseId, setSyncingCourseId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Sync URL params
  const updateUrl = useCallback((params: Record<string, string | undefined>) => {
    const url = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      page: String(currentPage),
      search: debouncedSearch || undefined,
      role: roleFilter || undefined,
      gender: genderFilter || undefined,
      blocked: blockedFilter || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortBy ? sortOrder : undefined,
      ...params,
    };
    // Preserve action param if present
    if (action) merged.action = action;
    Object.entries(merged).forEach(([k, v]) => { if (v) url.set(k, v as string); });
    router.replace(`/admin/users?${url.toString()}`, { scroll: false });
  }, [currentPage, debouncedSearch, roleFilter, genderFilter, blockedFilter, sortBy, sortOrder, action, router]);

  // Load all users once on mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, roleFilter, genderFilter, blockedFilter, sortBy, sortOrder]);

  // Update URL when state changes (except initial load)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    updateUrl({});
  }, [currentPage, debouncedSearch, roleFilter, genderFilter, blockedFilter, sortBy, sortOrder]);

  // Client-side filtering
  const filteredUsers = allUsers.filter((u) => {
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    if (roleFilter && u.role !== roleFilter) return false;
    if (genderFilter && u.gender !== genderFilter) return false;
    if (blockedFilter === 'true' && !u.blocked) return false;
    if (blockedFilter === 'false' && u.blocked) return false;
    return true;
  });

  // Client-side sorting
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortBy) return 0;
    const dir = sortOrder === 'asc' ? 1 : -1;
    switch (sortBy) {
      case 'name': return dir * a.name.localeCompare(b.name, 'ar');
      case 'role': return dir * a.role.localeCompare(b.role);
      case 'status': return dir * (Number(a.blocked) - Number(b.blocked));
      case 'gender': return dir * (a.gender || '').localeCompare(b.gender || '');
      case 'createdAt': return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      default: return 0;
    }
  });

  // Client-side pagination
  const totalFiltered = sortedUsers.length;
  const totalPages = Math.ceil(totalFiltered / ITEMS_PER_PAGE) || 1;
  const users = sortedUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setAllUsers(response.data as User[]);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleCheckOldGradesSync = async (user: User) => {
    setSyncCheckUser(user);
    setSyncLoading(true);
    setSyncData(null);
    try {
      const response = await api.get(`/users/${user.id}/old-grades-sync`);
      setSyncData(response.data);
    } catch (error) {
      console.error('Failed to check old grades sync:', error);
      showError('فشل التحقق من مزامنة الدرجات القديمة');
      setSyncCheckUser(null);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncSingleGrade = async (userId: string, courseId: string) => {
    setSyncingCourseId(courseId);
    try {
      await api.post(`/users/${userId}/old-grades-sync`, { courseId });
      showSuccess('تم مزامنة الدرجة بنجاح');
      // Refresh sync data
      const response = await api.get(`/users/${userId}/old-grades-sync`);
      setSyncData(response.data);
    } catch (error) {
      console.error('Failed to sync grade:', error);
      showError('فشل مزامنة الدرجة');
    } finally {
      setSyncingCourseId(null);
    }
  };

  const handleBlock = async (id: string, blocked: boolean) => {
    try {
      await api.put(`/users/${id}`, { blocked: !blocked });
      setAllUsers(allUsers.map(u => u.id === id ? { ...u, blocked: !blocked } : u));
      showSuccess(blocked ? 'تم إلغاء الحظر' : 'تم حظر المستخدم');
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل تحديث المستخدم');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ message: 'هل أنت متأكد من حذف هذا المستخدم؟', title: 'حذف المستخدم', variant: 'danger' });
    if (!ok) return;

    try {
      await api.delete(`/users/${id}`);
      showSuccess(TOAST_MESSAGES.DELETE_SUCCESS);
      loadUsers(); // Reload current page
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل حذف المستخدم');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      firstName: user.firstName || '',
      fatherName: user.fatherName || '',
      familyName: user.familyName || '',
      dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth) : null,
      phone: user.phone || '',
      profession: user.profession || '',
      gender: (user.gender as 'MALE' | 'FEMALE' | '') || '',
      idNumber: user.idNumber || '',
      location: user.location || '',
      password: '',
    });
    setEditErrors({});
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    // Validation
    const errors: { [key: string]: string } = {};
    if (!editFormData.firstName || editFormData.firstName.length < 2) {
      errors.firstName = 'الاسم الشخصي يجب أن يكون حرفين على الأقل';
    }
    if (!editFormData.fatherName || editFormData.fatherName.length < 2) {
      errors.fatherName = 'اسم الوالد يجب أن يكون حرفين على الأقل';
    }
    if (!editFormData.familyName || editFormData.familyName.length < 2) {
      errors.familyName = 'اسم العائلة يجب أن يكون حرفين على الأقل';
    }
    if (!editFormData.dateOfBirth) {
      errors.dateOfBirth = 'تاريخ الولادة مطلوب';
    }
    if (!editFormData.phone || editFormData.phone.length < 7 || editFormData.phone.length > 10) {
      errors.phone = 'رقم الهاتف يجب أن يكون بين 7 و 10 أرقام';
    } else if (!/^[0-9]+$/.test(editFormData.phone)) {
      errors.phone = 'رقم الهاتف يجب أن يحتوي على أرقام فقط';
    }
    if (!editFormData.profession || editFormData.profession.length < 2) {
      errors.profession = 'المهنة مطلوبة';
    }
    if (!editFormData.gender) {
      errors.gender = 'يرجى اختيار الفئة';
    }
    if (!editFormData.idNumber || editFormData.idNumber.length !== 9) {
      errors.idNumber = 'رقم الهوية يجب أن يكون 9 أرقام بالضبط';
    } else if (!/^[0-9]+$/.test(editFormData.idNumber)) {
      errors.idNumber = 'رقم الهوية يجب أن يحتوي على أرقام فقط';
    }
    if (!editFormData.location || editFormData.location.length < 2) {
      errors.location = 'البلد مطلوب';
    }
    if (editFormData.password && editFormData.password.length < 6) {
      errors.password = 'كلمة المرور يجب أن تكون على الأقل 6 أحرف';
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    // Double confirmation
    const ok = await confirm({ message: 'هل أنت متأكد من تحديث بيانات هذا المستخدم؟', title: 'تحديث بيانات المستخدم', variant: 'warning' });
    if (!ok) return;
    if (editFormData.password) {
      const ok2 = await confirm({ message: 'هل أنت متأكد من تغيير كلمة المرور؟', title: 'تغيير كلمة المرور', variant: 'warning' });
      if (!ok2) return;
    }

    try {
      const updateData: any = {
        firstName: editFormData.firstName,
        fatherName: editFormData.fatherName,
        familyName: editFormData.familyName,
        dateOfBirth: editFormData.dateOfBirth?.toISOString(),
        phone: editFormData.phone,
        profession: editFormData.profession,
        gender: editFormData.gender,
        idNumber: editFormData.idNumber,
        location: editFormData.location,
      };
      if (editFormData.password) {
        updateData.password = editFormData.password;
      }

      await api.put(`/users/${editingUser.id}`, updateData);
      const newName = `${editFormData.firstName} ${editFormData.fatherName} ${editFormData.familyName}`;
      setAllUsers(allUsers.map(u => u.id === editingUser.id ? { ...u, name: newName } : u));
      setEditingUser(null);
      setEditFormData({
        firstName: '',
        fatherName: '',
        familyName: '',
        dateOfBirth: null,
        phone: '',
        profession: '',
        gender: '',
        idNumber: '',
        location: '',
        password: '',
      });
      setEditErrors({});
      showSuccess(TOAST_MESSAGES.UPDATE_SUCCESS);
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل تحديث بيانات المستخدم');
    }
  };

  const handleCreateUser = async () => {
    setCreateErrors({});

    // Validation
    const errors: { [key: string]: string } = {};

    if (!createFormData.firstName || createFormData.firstName.length < 2) {
      errors.firstName = 'الاسم الشخصي يجب أن يكون حرفين على الأقل';
    }
    if (!createFormData.fatherName || createFormData.fatherName.length < 2) {
      errors.fatherName = 'اسم الوالد يجب أن يكون حرفين على الأقل';
    }
    if (!createFormData.familyName || createFormData.familyName.length < 2) {
      errors.familyName = 'اسم العائلة يجب أن يكون حرفين على الأقل';
    }
    if (!createFormData.email || !createFormData.email.includes('@')) {
      errors.email = 'البريد الإلكتروني غير صحيح';
    }
    if (!createFormData.password || createFormData.password.length < 6) {
      errors.password = 'كلمة المرور يجب أن تكون على الأقل 6 أحرف';
    }
    if (!createFormData.confirmPassword) {
      errors.confirmPassword = 'تأكيد كلمة المرور مطلوب';
    } else if (createFormData.password !== createFormData.confirmPassword) {
      errors.confirmPassword = 'كلمة المرور غير متطابقة';
    }
    if (!createFormData.dateOfBirth) {
      errors.dateOfBirth = 'تاريخ الولادة مطلوب';
    }
    if (!createFormData.phone || createFormData.phone.length < 7 || createFormData.phone.length > 10) {
      errors.phone = 'رقم الهاتف يجب أن يكون بين 7 و 10 أرقام';
    } else if (!/^[0-9]+$/.test(createFormData.phone)) {
      errors.phone = 'رقم الهاتف يجب أن يحتوي على أرقام فقط';
    }
    if (!createFormData.profession || createFormData.profession.length < 2) {
      errors.profession = 'المهنة مطلوبة';
    }
    if (!createFormData.gender) {
      errors.gender = 'يرجى اختيار الفئة';
    }
    if (!createFormData.idNumber || createFormData.idNumber.length !== 9) {
      errors.idNumber = 'رقم الهوية يجب أن يكون 9 أرقام بالضبط';
    } else if (!/^[0-9]+$/.test(createFormData.idNumber)) {
      errors.idNumber = 'رقم الهوية يجب أن يحتوي على أرقام فقط';
    }
    if (!createFormData.location || createFormData.location.length < 2) {
      errors.location = 'البلد مطلوب';
    }

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    const ok3 = await confirm({ message: 'هل أنت متأكد من إنشاء هذا المستخدم؟', title: 'إنشاء مستخدم', variant: 'info' });
    if (!ok3) return;

    try {
      await api.post('/users', {
        firstName: createFormData.firstName,
        fatherName: createFormData.fatherName,
        familyName: createFormData.familyName,
        email: createFormData.email,
        password: createFormData.password,
        role: createFormData.role,
        dateOfBirth: createFormData.dateOfBirth?.toISOString(),
        phone: createFormData.phone,
        profession: createFormData.profession,
        gender: createFormData.gender,
        idNumber: createFormData.idNumber,
        location: createFormData.location,
      });

      showSuccess(TOAST_MESSAGES.CREATE_SUCCESS);
      setShowCreateForm(false);
      setShowCreatePassword(false);
      setShowCreateConfirmPassword(false);
      setCreateFormData({
        firstName: '',
        fatherName: '',
        familyName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'STUDENT',
        dateOfBirth: null,
        phone: '',
        profession: '',
        gender: '',
        idNumber: '',
        location: '',
      });
      router.push('/admin/users');
      loadUsers();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل إنشاء المستخدم');
    }
  };

  const handleViewProfile = async (user: User) => {
    setViewingProfile(user);
    setProfileLoading(true);
    
    try {
      const response = await api.get(`/users/${user.id}/profile`);
      setProfileData(response.data);
    } catch (error) {
      console.error('Failed to load profile:', error);
      showError('فشل تحميل الملف الشخصي');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
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

  const handleRoleFilter = (value: string) => { setRoleFilter(value); setCurrentPage(1); };
  const handleGenderFilter = (value: string) => { setGenderFilter(value); setCurrentPage(1); };
  const handleBlockedFilter = (value: string) => { setBlockedFilter(value); setCurrentPage(1); };

  // Filter options
  const roleOptions = [
    { value: 'ADMIN', label: 'مشرف' },
    { value: 'TEACHER', label: 'مدرس' },
    { value: 'STUDENT', label: 'طالب' },
  ];
  const genderOptions = [
    { value: 'MALE', label: 'أخوة' },
    { value: 'FEMALE', label: 'أخوات' },
  ];
  const blockedOptions = [
    { value: 'false', label: 'نشط' },
    { value: 'true', label: 'محظور' },
  ];

  const activeFilterCount = [roleFilter, genderFilter, blockedFilter, debouncedSearch].filter(Boolean).length;

  // Stats based on all users (accurate totals)
  const stats = {
    total: allUsers.length,
    admins: allUsers.filter(u => u.role === 'ADMIN').length,
    teachers: allUsers.filter(u => u.role === 'TEACHER').length,
    students: allUsers.filter(u => u.role === 'STUDENT').length,
  };

  if (loading && allUsers.length === 0) {
    return <PageLoading title="المستخدمين" icon={<UsersIcon size={24} />} />;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <UsersIcon size={24} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">إدارة المستخدمين</h1>
                <p className="text-white/70 text-sm">{stats.total} مستخدم مسجل</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setExporting(true);
                  try {
                    await exportUsersToExcel(sortedUsers);
                    showSuccess('تم تصدير الملف بنجاح');
                  } catch (err) {
                    console.error('Excel export failed:', err);
                    showError('فشل في تصدير الملف');
                  } finally {
                    setExporting(false);
                  }
                }}
                disabled={exporting || sortedUsers.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg disabled:opacity-50"
              >
                <Download size={18} />
                {exporting ? 'جاري التصدير...' : 'تصدير إكسل'}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(true);
                  router.push('/admin/users?action=create');
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#c9a227] text-white rounded-xl font-bold hover:bg-[#b08f20] transition-all shadow-lg"
              >
                <PlusIcon size={18} />
                إنشاء مستخدم جديد
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <p className="text-2xl font-bold text-[#1a3a2f]">{stats.total}</p>
            <p className="text-sm text-stone-500">إجمالي المستخدمين</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <p className="text-2xl font-bold text-violet-600">{stats.admins}</p>
            <p className="text-sm text-stone-500">المشرفون</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <p className="text-2xl font-bold text-sky-600">{stats.teachers}</p>
            <p className="text-sm text-stone-500">المدرسون</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100">
            <p className="text-2xl font-bold text-emerald-600">{stats.students}</p>
            <p className="text-sm text-stone-500">الطلاب</p>
          </div>
        </div>

        {/* Search + Active Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4 mb-6 space-y-3">
          <div className="relative">
            <SearchIcon size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="ابحث عن مستخدم..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pr-10 pl-4 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f] text-stone-800 bg-white transition-all"
            />
          </div>
          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {roleFilter && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 text-sm font-medium">
                  الدور: {roleOptions.find(o => o.value === roleFilter)?.label}
                  <button onClick={() => handleRoleFilter('')} className="mr-1 hover:text-amber-600">×</button>
                </span>
              )}
              {genderFilter && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 text-sm font-medium">
                  الفئة: {genderOptions.find(o => o.value === genderFilter)?.label}
                  <button onClick={() => handleGenderFilter('')} className="mr-1 hover:text-amber-600">×</button>
                </span>
              )}
              {blockedFilter && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 text-sm font-medium">
                  الحالة: {blockedOptions.find(o => o.value === blockedFilter)?.label}
                  <button onClick={() => handleBlockedFilter('')} className="mr-1 hover:text-amber-600">×</button>
                </span>
              )}
              {debouncedSearch && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 text-sm font-medium">
                  بحث: {debouncedSearch}
                  <button onClick={() => { setSearch(''); setCurrentPage(1); }} className="mr-1 hover:text-amber-600">×</button>
                </span>
              )}
              <button
                onClick={() => { setSearch(''); setRoleFilter(''); setGenderFilter(''); setBlockedFilter(''); setCurrentPage(1); }}
                className="text-sm text-stone-500 hover:text-stone-700 transition"
              >
                مسح الكل
              </button>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className={`bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {users.length === 0 && !loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UsersIcon size={32} className="text-stone-400" />
              </div>
              <p className="text-stone-500 text-lg mb-4">
                {activeFilterCount > 0 ? 'لا يوجد مستخدمين مطابقين للبحث' : 'لا يوجد مستخدمين'}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setSearch(''); setRoleFilter(''); setGenderFilter(''); setBlockedFilter(''); setCurrentPage(1); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-100 text-stone-700 rounded-xl font-bold hover:bg-stone-200 transition"
                >
                  مسح التصفية
                </button>
              )}
            </div>
          ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <SortableHeader field="name" label="المستخدم" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <SortableHeader
                      field="role"
                      label="الدور"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                      filterNode={
                        <ColumnFilterDropdown options={roleOptions} value={roleFilter} onChange={handleRoleFilter} label="الدور" />
                      }
                    />
                    <SortableHeader
                      field="status"
                      label="الحالة"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                      filterNode={
                        <ColumnFilterDropdown options={blockedOptions} value={blockedFilter} onChange={handleBlockedFilter} label="الحالة" />
                      }
                    />
                    <SortableHeader
                      field="gender"
                      label="الفئة"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                      className="hidden md:table-cell"
                      filterNode={
                        <ColumnFilterDropdown options={genderOptions} value={genderFilter} onChange={handleGenderFilter} label="الفئة" />
                      }
                    />
                    <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider hidden lg:table-cell">الإحصائيات</th>
                    <SortableHeader field="createdAt" label="تاريخ التسجيل" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="hidden sm:table-cell" />
                    <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#1a3a2f] to-[#2d5a4a] rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-stone-800">{user.name}</h3>
                            <p className="text-sm text-stone-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                          user.role === 'ADMIN' 
                            ? 'bg-violet-100 text-violet-700'
                            : user.role === 'TEACHER'
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {user.role === 'ADMIN' ? 'مشرف' : user.role === 'TEACHER' ? 'مدرس' : 'طالب'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                          user.blocked 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {user.blocked ? 'محظور' : 'نشط'}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                          user.gender === 'MALE'
                            ? 'bg-blue-100 text-blue-700'
                            : user.gender === 'FEMALE'
                            ? 'bg-pink-100 text-pink-700'
                            : 'bg-stone-100 text-stone-600'
                        }`}>
                          {user.gender === 'MALE' ? 'أخ' : user.gender === 'FEMALE' ? 'أخت' : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-600 hidden lg:table-cell">
                        {user.role === 'TEACHER' && (
                          <span className="font-medium">{user._count?.coursesTaught || 0} دورة</span>
                        )}
                        {user.role === 'STUDENT' && (
                          <span className="font-medium">{user._count?.enrollments || 0} تسجيل</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-500 hidden sm:table-cell" dir="ltr">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => handleViewProfile(user)}
                            className="px-3 py-1.5 bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100 transition text-sm font-medium"
                          >
                            عرض
                          </button>
                          <button
                            onClick={() => handleEdit(user)}
                            className="px-3 py-1.5 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100 transition text-sm font-medium"
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => handleBlock(user.id, user.blocked)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                              user.blocked
                                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                            }`}
                          >
                            {user.blocked ? 'تفعيل' : 'حظر'}
                          </button>
                          {user.role === 'STUDENT' && (
                            <button
                              onClick={() => handleCheckOldGradesSync(user)}
                              className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition text-sm font-medium"
                            >
                              الدرجات القديمة
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(user.id)}
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
                  total={totalFiltered}
                  itemName="مستخدم"
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

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => {
          setEditingUser(null);
          setEditFormData({
            firstName: '',
            fatherName: '',
            familyName: '',
            dateOfBirth: null,
            phone: '',
            profession: '',
            gender: '',
            idNumber: '',
            location: '',
            password: '',
          });
          setEditErrors({});
        }}
        title="تعديل بيانات المستخدم"
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
          {/* Name fields in 3-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-800">
                الاسم الشخصي <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editFormData.firstName}
                onChange={(e) => {
                  setEditFormData({ ...editFormData, firstName: e.target.value });
                  if (editErrors.firstName) setEditErrors({ ...editErrors, firstName: '' });
                }}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white ${
                  editErrors.firstName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="الاسم"
              />
              {editErrors.firstName && <p className="text-red-500 text-xs mt-1">{editErrors.firstName}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-800">
                اسم الوالد <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editFormData.fatherName}
                onChange={(e) => {
                  setEditFormData({ ...editFormData, fatherName: e.target.value });
                  if (editErrors.fatherName) setEditErrors({ ...editErrors, fatherName: '' });
                }}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white ${
                  editErrors.fatherName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="الوالد"
              />
              {editErrors.fatherName && <p className="text-red-500 text-xs mt-1">{editErrors.fatherName}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-800">
                اسم العائلة <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editFormData.familyName}
                onChange={(e) => {
                  setEditFormData({ ...editFormData, familyName: e.target.value });
                  if (editErrors.familyName) setEditErrors({ ...editErrors, familyName: '' });
                }}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white ${
                  editErrors.familyName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="العائلة"
              />
              {editErrors.familyName && <p className="text-red-500 text-xs mt-1">{editErrors.familyName}</p>}
            </div>
          </div>

          {/* Profile section */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">البيانات الشخصية</h3>

            <DatePicker
              label="تاريخ الولادة"
              value={editFormData.dateOfBirth}
              onChange={(date) => {
                setEditFormData({ ...editFormData, dateOfBirth: date });
                if (editErrors.dateOfBirth) setEditErrors({ ...editErrors, dateOfBirth: '' });
              }}
              maxDate={new Date()}
              minDate={new Date('1900-01-01')}
              placeholder="اختر تاريخ الولادة"
              error={editErrors.dateOfBirth}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">
                  الهاتف <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setEditFormData({ ...editFormData, phone: value });
                    if (editErrors.phone) setEditErrors({ ...editErrors, phone: '' });
                  }}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white ${
                    editErrors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="05xxxxxxxx"
                  maxLength={10}
                />
                {editErrors.phone && <p className="text-red-500 text-xs mt-1">{editErrors.phone}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">
                  المهنة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFormData.profession}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, profession: e.target.value });
                    if (editErrors.profession) setEditErrors({ ...editErrors, profession: '' });
                  }}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white ${
                    editErrors.profession ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="المهنة"
                />
                {editErrors.profession && <p className="text-red-500 text-xs mt-1">{editErrors.profession}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <GenderSelect
                label="الفئة"
                value={editFormData.gender}
                onChange={(value) => {
                  setEditFormData({ ...editFormData, gender: value });
                  if (editErrors.gender) setEditErrors({ ...editErrors, gender: '' });
                }}
                error={editErrors.gender}
                required
              />
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">
                  رقم الهوية <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFormData.idNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setEditFormData({ ...editFormData, idNumber: value });
                    if (editErrors.idNumber) setEditErrors({ ...editErrors, idNumber: '' });
                  }}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white ${
                    editErrors.idNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="رقم الهوية (9 أرقام)"
                  maxLength={9}
                />
                {editErrors.idNumber && <p className="text-red-500 text-xs mt-1">{editErrors.idNumber}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">
                  البلد <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFormData.location}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, location: e.target.value });
                    if (editErrors.location) setEditErrors({ ...editErrors, location: '' });
                  }}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white ${
                    editErrors.location ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="البلد"
                />
                {editErrors.location && <p className="text-red-500 text-xs mt-1">{editErrors.location}</p>}
              </div>
            </div>
          </div>

          {/* Password section */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-800">كلمة المرور الجديدة (اختياري)</label>
              <input
                type="password"
                value={editFormData.password}
                onChange={(e) => {
                  setEditFormData({ ...editFormData, password: e.target.value });
                  if (editErrors.password) setEditErrors({ ...editErrors, password: '' });
                }}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white ${
                  editErrors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="اتركه فارغاً للاحتفاظ بكلمة المرور الحالية"
              />
              {editErrors.password && <p className="text-red-500 text-xs mt-1">{editErrors.password}</p>}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleSaveEdit}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-bold text-lg hover:bg-primary-dark transition"
            >
              حفظ
            </button>
            <button
              onClick={() => {
                setEditingUser(null);
                setEditFormData({
                  firstName: '',
                  fatherName: '',
                  familyName: '',
                  dateOfBirth: null,
                  phone: '',
                  profession: '',
                  gender: '',
                  idNumber: '',
                  location: '',
                  password: '',
                });
                setEditErrors({});
              }}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold text-lg hover:bg-gray-300 transition"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateForm}
        onClose={() => {
          setShowCreateForm(false);
          setShowCreatePassword(false);
          setShowCreateConfirmPassword(false);
          router.push('/admin/users');
          setCreateFormData({
            firstName: '',
            fatherName: '',
            familyName: '',
            email: '',
            password: '',
            confirmPassword: '',
            role: 'STUDENT',
            dateOfBirth: null,
            phone: '',
            profession: '',
            gender: '',
            idNumber: '',
            location: '',
          });
          setCreateErrors({});
        }}
        title="إنشاء مستخدم جديد"
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
          {/* Name fields in 3-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-800">
                الاسم الشخصي <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={createFormData.firstName}
                onChange={(e) => {
                  setCreateFormData({ ...createFormData, firstName: e.target.value });
                  if (createErrors.firstName) setCreateErrors({ ...createErrors, firstName: '' });
                }}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white ${
                  createErrors.firstName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="الاسم"
              />
              {createErrors.firstName && <p className="text-red-500 text-xs mt-1">{createErrors.firstName}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-800">
                اسم الوالد <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={createFormData.fatherName}
                onChange={(e) => {
                  setCreateFormData({ ...createFormData, fatherName: e.target.value });
                  if (createErrors.fatherName) setCreateErrors({ ...createErrors, fatherName: '' });
                }}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white ${
                  createErrors.fatherName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="الوالد"
              />
              {createErrors.fatherName && <p className="text-red-500 text-xs mt-1">{createErrors.fatherName}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-800">
                اسم العائلة <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={createFormData.familyName}
                onChange={(e) => {
                  setCreateFormData({ ...createFormData, familyName: e.target.value });
                  if (createErrors.familyName) setCreateErrors({ ...createErrors, familyName: '' });
                }}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white ${
                  createErrors.familyName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="العائلة"
              />
              {createErrors.familyName && <p className="text-red-500 text-xs mt-1">{createErrors.familyName}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-800">
              البريد الإلكتروني <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={createFormData.email}
              onChange={(e) => {
                setCreateFormData({ ...createFormData, email: e.target.value });
                if (createErrors.email) setCreateErrors({ ...createErrors, email: '' });
              }}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white ${
                createErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="example@email.com"
            />
            {createErrors.email && <p className="text-red-500 text-xs mt-1">{createErrors.email}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-800">
                كلمة المرور <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCreatePassword ? 'text' : 'password'}
                  value={createFormData.password}
                  onChange={(e) => {
                    setCreateFormData({ ...createFormData, password: e.target.value });
                    if (createErrors.password) setCreateErrors({ ...createErrors, password: '' });
                  }}
                  className={`w-full px-4 py-3 pe-12 border-2 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white ${
                    createErrors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="6 أحرف على الأقل"
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                  tabIndex={-1}
                >
                  {showCreatePassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                </button>
              </div>
              {createErrors.password && <p className="text-red-500 text-xs mt-1">{createErrors.password}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-800">
                تأكيد كلمة المرور <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCreateConfirmPassword ? 'text' : 'password'}
                  value={createFormData.confirmPassword}
                  onChange={(e) => {
                    setCreateFormData({ ...createFormData, confirmPassword: e.target.value });
                    if (createErrors.confirmPassword) setCreateErrors({ ...createErrors, confirmPassword: '' });
                  }}
                  className={`w-full px-4 py-3 pe-12 border-2 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white ${
                    createErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="أعد إدخال كلمة المرور"
                />
                <button
                  type="button"
                  onClick={() => setShowCreateConfirmPassword(!showCreateConfirmPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                  tabIndex={-1}
                >
                  {showCreateConfirmPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                </button>
              </div>
              {createErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{createErrors.confirmPassword}</p>}
            </div>
          </div>

          <div>
              <label className="block text-sm font-semibold mb-2 text-gray-800">
                الدور <span className="text-red-500">*</span>
              </label>
              <select
                value={createFormData.role}
                onChange={(e) => setCreateFormData({ ...createFormData, role: e.target.value as 'ADMIN' | 'TEACHER' | 'STUDENT' })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white"
              >
                <option value="STUDENT">طالب</option>
                <option value="TEACHER">مدرس</option>
                <option value="ADMIN">مشرف</option>
              </select>
          </div>

          {/* Profile section */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">البيانات الشخصية</h3>

            <DatePicker
              label="تاريخ الولادة"
              value={createFormData.dateOfBirth}
              onChange={(date) => {
                setCreateFormData({ ...createFormData, dateOfBirth: date });
                if (createErrors.dateOfBirth) setCreateErrors({ ...createErrors, dateOfBirth: '' });
              }}
              maxDate={new Date()}
              minDate={new Date('1900-01-01')}
              placeholder="اختر تاريخ الولادة"
              error={createErrors.dateOfBirth}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">
                  الهاتف <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={createFormData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setCreateFormData({ ...createFormData, phone: value });
                    if (createErrors.phone) setCreateErrors({ ...createErrors, phone: '' });
                  }}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white ${
                    createErrors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="05xxxxxxxx"
                  maxLength={10}
                />
                {createErrors.phone && <p className="text-red-500 text-xs mt-1">{createErrors.phone}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">
                  المهنة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createFormData.profession}
                  onChange={(e) => {
                    setCreateFormData({ ...createFormData, profession: e.target.value });
                    if (createErrors.profession) setCreateErrors({ ...createErrors, profession: '' });
                  }}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white ${
                    createErrors.profession ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="المهنة"
                />
                {createErrors.profession && <p className="text-red-500 text-xs mt-1">{createErrors.profession}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <GenderSelect
                label="الفئة"
                value={createFormData.gender}
                onChange={(value) => {
                  setCreateFormData({ ...createFormData, gender: value });
                  if (createErrors.gender) setCreateErrors({ ...createErrors, gender: '' });
                }}
                error={createErrors.gender}
                required
              />
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">
                  رقم الهوية <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createFormData.idNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setCreateFormData({ ...createFormData, idNumber: value });
                    if (createErrors.idNumber) setCreateErrors({ ...createErrors, idNumber: '' });
                  }}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white ${
                    createErrors.idNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="رقم الهوية (9 أرقام)"
                  maxLength={9}
                />
                {createErrors.idNumber && <p className="text-red-500 text-xs mt-1">{createErrors.idNumber}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">
                  البلد <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createFormData.location}
                  onChange={(e) => {
                    setCreateFormData({ ...createFormData, location: e.target.value });
                    if (createErrors.location) setCreateErrors({ ...createErrors, location: '' });
                  }}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white ${
                    createErrors.location ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="البلد"
                />
                {createErrors.location && <p className="text-red-500 text-xs mt-1">{createErrors.location}</p>}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleCreateUser}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-bold text-lg hover:bg-primary-dark transition"
            >
              إنشاء
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                router.push('/admin/users');
                setCreateFormData({
                  firstName: '',
                  fatherName: '',
                  familyName: '',
                  email: '',
                  password: '',
                  confirmPassword: '',
                  role: 'STUDENT',
                  dateOfBirth: null,
                  phone: '',
                  profession: '',
                  gender: '',
                  idNumber: '',
                  location: '',
                });
                setCreateErrors({});
              }}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold text-lg hover:bg-gray-300 transition"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      {/* View Profile Modal */}
      <Modal
        isOpen={!!viewingProfile}
        onClose={() => {
          setViewingProfile(null);
          setProfileData(null);
        }}
        title="الملف الشخصي"
        size="lg"
      >
        {profileLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div>
          </div>
        ) : profileData ? (
          <div className="space-y-6">
                {/* User Info */}
                <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white font-bold text-3xl">
                    {profileData.name?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">{profileData.name}</h3>
                    <p className="text-lg text-gray-600">{profileData.email}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        profileData.role === 'ADMIN' 
                          ? 'bg-purple-100 text-purple-800'
                          : profileData.role === 'TEACHER'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {profileData.role === 'ADMIN' ? 'مشرف' : profileData.role === 'TEACHER' ? 'مدرس' : 'طالب'}
                      </span>
                      {profileData.provider && (
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
                          {profileData.provider === 'GOOGLE' ? 'Google' : profileData.provider === 'APPLE' ? 'Apple' : 'Email'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Personal Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b border-gray-200">
                  {profileData.gender && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 font-medium">الفئة:</span>
                      <span className="text-gray-800">{profileData.gender === 'MALE' ? 'أخوة' : 'أخوات'}</span>
                    </div>
                  )}
                  {profileData.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 font-medium">رقم الهاتف:</span>
                      <span className="text-gray-800" dir="ltr">{profileData.phone}</span>
                    </div>
                  )}
                  {profileData.idNumber && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 font-medium">رقم الهوية:</span>
                      <span className="text-gray-800" dir="ltr">{profileData.idNumber}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 font-medium">الحالة:</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${profileData.blocked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {profileData.blocked ? 'محظور' : 'نشط'}
                    </span>
                  </div>
                  {profileData.profession && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 font-medium">المهنة:</span>
                      <span className="text-gray-800">{profileData.profession}</span>
                    </div>
                  )}
                  {profileData.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 font-medium">البلد:</span>
                      <span className="text-gray-800">{profileData.location}</span>
                    </div>
                  )}
                  {profileData.dateOfBirth && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 font-medium">تاريخ الولادة:</span>
                      <span className="text-gray-800" dir="ltr">{formatDate(profileData.dateOfBirth)}</span>
                    </div>
                  )}
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {profileData.role === 'STUDENT' && (
                    <>
                      <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                        <p className="text-sm text-blue-600 font-semibold">التسجيلات</p>
                        <p className="text-2xl font-bold text-blue-800">{profileData._count?.enrollments || 0}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                        <p className="text-sm text-green-600 font-semibold">الامتحانات</p>
                        <p className="text-2xl font-bold text-green-800">{profileData._count?.examAttempts || 0}</p>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
                        <p className="text-sm text-yellow-600 font-semibold">الواجبات</p>
                        <p className="text-2xl font-bold text-yellow-800">{profileData._count?.homeworkSubmissions || 0}</p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                        <p className="text-sm text-purple-600 font-semibold">التقييمات</p>
                        <p className="text-2xl font-bold text-purple-800">{profileData._count?.grades || 0}</p>
                      </div>
                    </>
                  )}
                  {profileData.role === 'TEACHER' && (
                    <>
                      <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                        <p className="text-sm text-blue-600 font-semibold">الدورات</p>
                        <p className="text-2xl font-bold text-blue-800">{profileData._count?.coursesTaught || 0}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Enrollments (for Students) */}
                {profileData.role === 'STUDENT' && profileData.enrollments && profileData.enrollments.length > 0 && (
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

                {/* Courses Taught (for Teachers) */}
                {profileData.role === 'TEACHER' && profileData.coursesTaught && profileData.coursesTaught.length > 0 && (
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

                {/* Recent Grades */}
                {profileData.grades && profileData.grades.length > 0 && (
                  <div>
                    <h4 className="text-xl font-bold text-gray-800 mb-4">آخر التقييمات</h4>
                    <div className="space-y-2">
                      {profileData.grades.map((grade: any) => (
                        <div key={grade.id} className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200 flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-gray-800">{grade.course.title}</p>
                            <p className="text-sm text-gray-600">
                              {grade.type === 'EXAM' ? 'امتحان' : grade.type === 'HOMEWORK' ? 'واجب' : 'تقييم'}
                            </p>
                          </div>
                          <div className="text-left">
                            <p className="text-lg font-bold text-gray-800">
                              {grade.score} / {grade.maxScore}
                            </p>
                            <p className="text-sm text-gray-600">{grade.letterGrade}</p>
                          </div>
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
              <div className="p-6 text-center text-gray-500">
                <p>فشل تحميل بيانات الملف الشخصي</p>
              </div>
            )}
      </Modal>
      {/* Old Grades Sync Check Modal */}
      <Modal
        isOpen={!!syncCheckUser}
        onClose={() => {
          setSyncCheckUser(null);
          setSyncData(null);
        }}
        title={`مزامنة الدرجات القديمة — ${syncCheckUser?.name || ''}`}
        size="lg"
      >
        {syncLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-500">جاري التحقق...</p>
          </div>
        ) : syncData ? (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-indigo-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-indigo-700">{syncData.totalOldGrades}</p>
                <p className="text-xs text-indigo-600 mt-1">إجمالي الدرجات القديمة</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{syncData.syncedCount}</p>
                <p className="text-xs text-emerald-600 mt-1">تم المزامنة</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">{syncData.unsyncedCount}</p>
                <p className="text-xs text-amber-600 mt-1">غير متزامن</p>
              </div>
            </div>

            {syncData.totalOldGrades === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>لا توجد درجات قديمة لهذا المستخدم</p>
              </div>
            ) : (
              /* Details Table */
              <div className="max-h-[40vh] overflow-y-auto">
                <table className="w-full text-sm" dir="rtl">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">رقم المادة</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">الدرجة النهائية</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">الحالة</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {syncData.details.map((detail, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-800 font-medium">{detail.courseNumber}</td>
                        <td className="px-4 py-2 text-gray-800">{detail.finalGrade}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            detail.synced
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {detail.synced ? 'متزامن ✓' : 'غير متزامن'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {!detail.synced && (
                            <button
                              onClick={() => handleSyncSingleGrade(syncCheckUser!.id, detail.courseId)}
                              disabled={syncingCourseId === detail.courseId}
                              className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition text-xs font-medium disabled:opacity-50"
                            >
                              {syncingCourseId === detail.courseId ? 'جاري...' : 'مزامنة'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
      <ConfirmDialog isOpen={confirmOpen} onClose={handleConfirmClose} onConfirm={handleConfirm} {...confirmOptions} />
    </div>
  );
}

