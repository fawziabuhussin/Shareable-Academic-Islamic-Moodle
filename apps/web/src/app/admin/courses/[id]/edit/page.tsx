'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { CreateResourceDTO } from '@/types/resource';
import { ResourceList, ResourceForm } from '@/components/resources';
import { showSuccess, showError, showWarning, TOAST_MESSAGES } from '@/lib/toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useConfirmDialog } from '@/lib/useConfirmDialog';
import { formatDate, formatDateTime, toDirectImageUrl } from '@/lib/utils';
import PageLoading from '@/components/PageLoading';
import { BookIcon } from '@/components/Icons';
import CollapsibleSection from '@/components/CollapsibleSection';
import { FileText, ClipboardList, HelpCircle, BookOpen, ArrowUp, ArrowDown } from 'lucide-react';

// Custom Lesson Type Dropdown
function LessonTypeDropdown({ value, onChange }: { value: string, onChange: (value: string) => void }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const options = [
    { value: 'VIDEO', label: 'فيديو (YouTube)' },
    { value: 'TEXT', label: 'نص' },
    { value: 'LIVE', label: 'بث مباشر' },
    { value: 'PLAYLIST', label: 'قائمة تشغيل' },
  ];

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary bg-white text-gray-800 font-medium text-right flex items-center justify-between"
        style={{ minHeight: '56px' }}
      >
        <span className="flex-1 text-right">
          {options.find(o => o.value === value)?.label || 'اختر النوع'}
        </span>
        <svg 
          className={`w-5 h-5 transition-transform ${dropdownOpen ? 'transform rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {dropdownOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setDropdownOpen(false)}
          />
          <div 
            className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg"
            style={{ direction: 'rtl' }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setDropdownOpen(false);
                }}
                className={`w-full text-right px-4 py-3 text-lg hover:bg-gray-100 transition ${
                  value === option.value ? 'bg-primary text-white' : 'text-gray-800'
                } ${option.value !== options[0].value ? 'border-t border-gray-200' : ''}`}
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

interface TeacherOption {
  id: string;
  name: string;
}

interface Category {
  id: string;
  title: string;
}

interface Resource {
  id: string;
  title: string;
  description: string | null; // Resource description
  url: string;
  order: number;
  courseId: string | null;
  lessonId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
  };
}

interface Lesson {
  id: string;
  title: string;
  type: string;
  youtubeUrl?: string;
  youtubePlaylistId?: string;
  textContent?: string;
  durationMinutes?: number;
  order: number;
  resources?: Resource[];
}

interface Module {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface Exam {
  id: string;
  title: string;
  description?: string;
  maxScore: number;
  startDate: string;
  endDate: string;
}

interface Homework {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  coverImage?: string;
  categoryId: string;
  price: number;
  status: string;
  readingWeight?: number;
  prerequisites?: Array<{
    prerequisite: { id: string; title: string };
  }>;
  teacher?: { id: string; name: string; email: string };
  _count?: { enrollments: number };
  modules: Module[];
  exams?: Exam[];
  homeworks?: Homework[];
  resources?: Resource[];
}

interface CourseSummary {
  id: string;
  title: string;
}

export default function EditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const { confirm, isOpen: confirmOpen, options: confirmOptions, handleConfirm, handleClose: handleConfirmClose } = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    coverImage: '',
    categoryId: '',
    price: 0,
    status: 'DRAFT' as 'DRAFT' | 'PUBLISHED',
    lifecycle: 'DEFAULT' as 'DEFAULT' | 'ONGOING',
  });
  const [weights, setWeights] = useState<{
    readingWeight: number;
    assessments: Array<{id: string; type: string; title: string; weightPercent: number}>;
    total: number;
    isValid: boolean;
    remaining: number;
  } | null>(null);
  const [weightsSaving, setWeightsSaving] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [availablePrerequisites, setAvailablePrerequisites] = useState<CourseSummary[]>([]);
  const [selectedPrerequisites, setSelectedPrerequisites] = useState<string[]>([]);
  const [showExamForm, setShowExamForm] = useState(false);
  const [showHomeworkForm, setShowHomeworkForm] = useState(false);
  
  // Course resources state
  const [courseResources, setCourseResources] = useState<Resource[]>([]);
  const [showCourseResourceForm, setShowCourseResourceForm] = useState(false);
  const [editingCourseResource, setEditingCourseResource] = useState<Resource | null>(null);
  
  // Lesson resources state
  const [showLessonResourceForm, setShowLessonResourceForm] = useState<string | null>(null);
  const [editingLessonResource, setEditingLessonResource] = useState<{
    lessonId: string;
    resource: Resource;
  } | null>(null);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [teacherDropdownOpen, setTeacherDropdownOpen] = useState(false);
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [lessonTypeDropdownOpen, setLessonTypeDropdownOpen] = useState(false);
  const [examFormData, setExamFormData] = useState({
    title: '',
    description: '',
    durationMinutes: 60,
    startDate: '',
    endDate: '',
    maxScore: 100,
    passingScore: 60,
    maxAttempts: 2,
    retakeScorePercent: 75,
  });
  const [importFromJson, setImportFromJson] = useState(false);
  const [jsonUrl, setJsonUrl] = useState('');
  const [importingExam, setImportingExam] = useState(false);
  const [homeworkFormData, setHomeworkFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    maxScore: 100,
  });
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<{ moduleId: string; lesson: Lesson } | null>(null);
  const [moduleFormData, setModuleFormData] = useState({ title: '', playlistUrl: '' });
  const [lessonFormData, setLessonFormData] = useState({
    title: '',
    type: 'VIDEO' as 'VIDEO' | 'TEXT' | 'LIVE' | 'PLAYLIST',
    youtubeUrl: '',
    youtubePlaylistId: '',
    textContent: '',
    durationMinutes: 0,
  });
  const [importPlaylistUrl, setImportPlaylistUrl] = useState('');
  const [importPlaylistModuleId, setImportPlaylistModuleId] = useState('');
  const [importPlaylistLoading, setImportPlaylistLoading] = useState(false);

  useEffect(() => {
    const courseId = Array.isArray(params.id) ? params.id[0] : params.id;
    if (courseId) {
      loadData();
    }
  }, [params.id]);

  const loadData = async () => {
    try {
      const courseId = Array.isArray(params.id) ? params.id[0] : params.id;
      
      if (!courseId) {
        showWarning('معرف الدورة غير صحيح');
        return;
      }

      const [courseRes, categoriesRes, examsRes, homeworksRes, coursesRes, teachersRes] = await Promise.all([
        api.get(`/courses/${courseId}`),
        api.get('/categories'),
        api.get(`/exams/course/${courseId}`).catch(() => ({ data: [] })),
        api.get(`/homework/course/${courseId}`).catch(() => ({ data: [] })),
        api.get('/courses/admin').catch(() => ({ data: [] })),
        api.get('/users/teachers').catch(() => ({ data: [] })),
      ]);

      const courseData = courseRes.data;
      setCourse(courseData);
      setFormData({
        title: courseData.title || '',
        description: courseData.description || '',
        coverImage: courseData.coverImage || '',
        categoryId: courseData.categoryId || '',
        price: courseData.price || 0,
        status: courseData.status || 'DRAFT',
        lifecycle: courseData.lifecycle || 'DEFAULT',
      });

      // Fetch weight summary
      const courseId2 = Array.isArray(params.id) ? params.id[0] : params.id;
      try {
        const weightRes = await api.get(`/courses/${courseId2}/weight-summary`);
        setWeights(weightRes.data);
      } catch (err) {
        console.error('Failed to fetch weights:', err);
      }

      setExams(examsRes.data || []);
      setHomeworks(homeworksRes.data || []);
      setCourseResources(courseData.resources || []);
      setCategories(categoriesRes.data || []);
      setTeachers(teachersRes.data || []);
      setSelectedTeacherId(courseData.teacher?.id || '');
      const allCourses = coursesRes.data || [];
      setAvailablePrerequisites(allCourses.filter((c: CourseSummary) => c.id !== courseId));
      setSelectedPrerequisites(
        (courseData.prerequisites || []).map((prereq: any) => prereq.prerequisite.id)
      );
    } catch (error: any) {
      console.error('Failed to load data:', error);
      showError(error.response?.data?.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || '',
        price: formData.price || 0,
        status: formData.status,
        lifecycle: formData.lifecycle,
        readingWeight: weights?.readingWeight || 0,
        prerequisiteCourseIds: selectedPrerequisites,
      };

      // Only include categoryId if it's a valid UUID (not empty string)
      if (formData.categoryId && formData.categoryId.trim() !== '') {
        updateData.categoryId = formData.categoryId;
      }

      // Always send coverImage so clearing it persists as null on the backend
      updateData.coverImage = formData.coverImage.trim() || '';

      const courseId = Array.isArray(params.id) ? params.id[0] : params.id;
      await api.put(`/courses/${courseId}`, updateData);
      showSuccess(TOAST_MESSAGES.UPDATE_SUCCESS);
      loadData();
    } catch (error: any) {
      console.error('Failed to update course:', error);
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map((e: any) => e.message).join('\n');
        showError(`أخطاء في التحقق: ${errorMessages}`);
      } else {
        showError(error.response?.data?.message || 'فشل تحديث الدورة');
      }
    } finally {
      setSaving(false);
    }
  };

  const resetExamForm = () => {
    setExamFormData({
      title: '',
      description: '',
      durationMinutes: 60,
      startDate: '',
      endDate: '',
      maxScore: 100,
      passingScore: 60,
      maxAttempts: 2,
      retakeScorePercent: 75,
    });
    setImportFromJson(false);
    setJsonUrl('');
  };

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    // Client-side date validation
    const startDateTime = new Date(examFormData.startDate);
    const endDateTime = new Date(examFormData.endDate);
    const now = new Date();
    if (startDateTime.getTime() < now.getTime() - 60000) {
      showWarning('تاريخ ووقت البدء لا يمكن أن يكون في الماضي');
      return;
    }
    if (endDateTime.getTime() <= startDateTime.getTime()) {
      showWarning('تاريخ ووقت الانتهاء يجب أن يكون بعد تاريخ ووقت البدء');
      return;
    }

    const courseId = Array.isArray(params.id) ? params.id[0] : params.id;

    // If importing from external source
    if (importFromJson) {
      if (!jsonUrl.trim()) {
        showWarning('الرابط مطلوب');
        return;
      }
      setImportingExam(true);
      try {
        const res = await api.post('/exams/import', {
          courseId,
          jsonUrl: jsonUrl.trim(),
          ...examFormData,
        });
        setShowExamForm(false);
        resetExamForm();
        showSuccess(`تم استيراد الامتحان بنجاح (${res.data.importedCount} سؤال)`);
        loadData();
        try {
          const weightRes = await api.get(`/courses/${courseId}/weight-summary`);
          setWeights(weightRes.data);
        } catch (err) {
          console.error('Failed to refresh weights:', err);
        }
      } catch (error: any) {
        if (error.response?.data?.errors) {
          const errorMessages = error.response.data.errors.map((e: any) => e.message).join('، ');
          showError(errorMessages);
        } else {
          showError(error.response?.data?.message || 'فشل استيراد الامتحان');
        }
      } finally {
        setImportingExam(false);
      }
      return;
    }

    try {
      await api.post('/exams', {
        courseId: courseId,
        ...examFormData,
      });
      setShowExamForm(false);
      resetExamForm();
      showSuccess(TOAST_MESSAGES.CREATE_SUCCESS);
      loadData();
      // Refresh weights after adding exam
      try {
        const weightRes = await api.get(`/courses/${courseId}/weight-summary`);
        setWeights(weightRes.data);
      } catch (err) {
        console.error('Failed to refresh weights:', err);
      }
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map((e: any) => e.message).join('، ');
        showError(errorMessages);
      } else {
        showError(error.response?.data?.message || 'فشل إضافة الامتحان');
      }
    }
  };

  const handleDeleteExam = async (examId: string) => {
    const ok = await confirm({ message: 'هل أنت متأكد من حذف هذا الامتحان؟', title: 'حذف الامتحان', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/exams/${examId}`);
      showSuccess(TOAST_MESSAGES.DELETE_SUCCESS);
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل حذف الامتحان');
    }
  };

  const handleAddHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const courseId = Array.isArray(params.id) ? params.id[0] : params.id;
      await api.post('/homework', {
        courseId: courseId,
        ...homeworkFormData,
      });
      setShowHomeworkForm(false);
      setHomeworkFormData({
        title: '',
        description: '',
        dueDate: '',
        maxScore: 100,
      });
      showSuccess(TOAST_MESSAGES.CREATE_SUCCESS);
      loadData();
      // Refresh weights after adding homework
      try {
        const courseId2 = Array.isArray(params.id) ? params.id[0] : params.id;
        const weightRes = await api.get(`/courses/${courseId2}/weight-summary`);
        setWeights(weightRes.data);
      } catch (err) {
        console.error('Failed to refresh weights:', err);
      }
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map((e: any) => e.message).join('، ');
        showError(errorMessages);
      } else {
        showError(error.response?.data?.message || 'فشل إضافة الواجب');
      }
    }
  };

  const handleDeleteHomework = async (homeworkId: string) => {
    const ok = await confirm({ message: 'هل أنت متأكد من حذف هذا الواجب؟', title: 'حذف الواجب', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/homework/${homeworkId}`);
      showSuccess(TOAST_MESSAGES.DELETE_SUCCESS);
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل حذف الواجب');
    }
  };

  // Course Resource Handlers
  const handleAddCourseResource = async (data: CreateResourceDTO) => {
    try {
      const courseId = Array.isArray(params.id) ? params.id[0] : params.id;
      await api.post(`/courses/${courseId}/resources`, data);
      setShowCourseResourceForm(false);
      showSuccess(TOAST_MESSAGES.CREATE_SUCCESS);
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل إضافة المادة');
      throw error;
    }
  };

  const handleUpdateCourseResource = async (data: CreateResourceDTO) => {
    if (!editingCourseResource) return;
    try {
      const courseId = Array.isArray(params.id) ? params.id[0] : params.id;
      await api.put(`/courses/${courseId}/resources/${editingCourseResource.id}`, data);
      setEditingCourseResource(null);
      setShowCourseResourceForm(false);
      showSuccess(TOAST_MESSAGES.UPDATE_SUCCESS);
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل تحديث المادة');
      throw error;
    }
  };

  const handleDeleteCourseResource = async (resourceId: string) => {
    const ok = await confirm({ message: 'هل أنت متأكد من حذف هذه المادة؟', title: 'حذف المادة', variant: 'danger' });
    if (!ok) return;
    try {
      const courseId = Array.isArray(params.id) ? params.id[0] : params.id;
      await api.delete(`/courses/${courseId}/resources/${resourceId}`);
      showSuccess(TOAST_MESSAGES.DELETE_SUCCESS);
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل حذف المادة');
    }
  };

  const handleEditCourseResource = (resource: Resource) => {
    setEditingCourseResource(resource);
    setShowCourseResourceForm(true);
  };

  // Lesson Resource Handlers
  const handleAddLessonResource = async (lessonId: string, data: CreateResourceDTO) => {
    try {
      await api.post(`/lessons/${lessonId}/resources`, data);
      setShowLessonResourceForm(null);
      showSuccess(TOAST_MESSAGES.CREATE_SUCCESS);
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل إضافة المادة');
      throw error;
    }
  };

  const handleUpdateLessonResource = async (data: CreateResourceDTO) => {
    if (!editingLessonResource) return;
    try {
      await api.put(
        `/lessons/${editingLessonResource.lessonId}/resources/${editingLessonResource.resource.id}`,
        data
      );
      setEditingLessonResource(null);
      setShowLessonResourceForm(null);
      showSuccess(TOAST_MESSAGES.UPDATE_SUCCESS);
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل تحديث المادة');
      throw error;
    }
  };

  const handleDeleteLessonResource = async (lessonId: string, resourceId: string) => {
    const ok = await confirm({ message: 'هل أنت متأكد من حذف هذه المادة؟', title: 'حذف المادة', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/lessons/${lessonId}/resources/${resourceId}`);
      showSuccess(TOAST_MESSAGES.DELETE_SUCCESS);
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل حذف المادة');
    }
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!moduleFormData.title.trim()) {
        showError('عنوان الوحدة مطلوب');
        return;
      }

      const courseId = Array.isArray(params.id) ? params.id[0] : params.id;
      
      if (!courseId) {
        showError('معرف الدورة غير صحيح');
        return;
      }

      if (moduleFormData.playlistUrl.trim()) {
        // Create module from YouTube playlist
        const response = await api.post('/playlists/create-module', {
          courseId,
          moduleTitle: moduleFormData.title.trim(),
          playlistUrl: moduleFormData.playlistUrl.trim(),
        });
        const videosCount = response.data.videosCount || 0;
        if (videosCount > 0) {
          showSuccess(`تم إنشاء الوحدة بنجاح مع ${videosCount} درس من قائمة التشغيل!`);
        } else {
          showSuccess('تم إنشاء الوحدة من قائمة التشغيل.');
        }
      } else {
        // Create empty module
        await api.post('/modules', {
          courseId,
          title: moduleFormData.title.trim(),
        });
        showSuccess(TOAST_MESSAGES.CREATE_SUCCESS);
      }
      
      setShowModuleForm(false);
      setModuleFormData({ title: '', playlistUrl: '' });
      loadData();
    } catch (error: any) {
      console.error('Error adding module:', error);
      let errorMsg = 'فشل إضافة الوحدة';
      
      if (error.response?.data) {
        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          errorMsg = error.response.data.errors.map((e: any) => e.message || e).join(', ');
        } else if (error.response.data.message) {
          errorMsg = error.response.data.message;
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      showError(errorMsg);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    const ok = await confirm({ message: 'هل أنت متأكد من حذف هذه الوحدة وجميع دروسها؟', title: 'حذف الوحدة', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/modules/${moduleId}`);
      showSuccess(TOAST_MESSAGES.DELETE_SUCCESS);
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل حذف الوحدة');
    }
  };

  const handleImportLessonsFromPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course?.modules?.length) {
      showWarning('أضف وحدة أولاً');
      return;
    }
    const moduleId = importPlaylistModuleId || course.modules[0].id;
    const url = importPlaylistUrl.trim();
    if (!url) {
      showWarning('أدخل رابط قائمة تشغيل YouTube');
      return;
    }
    setImportPlaylistLoading(true);
    try {
      const res = await api.post('/playlists/import-lessons', { moduleId, playlistUrl: url });
      showSuccess(res.data?.message || 'تم الاستيراد');
      setImportPlaylistUrl('');
      loadData();
    } catch (error: any) {
      const msg =
        error.response?.data?.errors?.map((x: { message?: string }) => x.message).join('\n') ||
        error.response?.data?.message ||
        'فشل استيراد الدروس من القائمة';
      showError(msg);
    } finally {
      setImportPlaylistLoading(false);
    }
  };

  const handleAddLesson = async (e: React.FormEvent, moduleId: string) => {
    e.preventDefault();
    try {
      if (!lessonFormData.title.trim()) {
        showError('عنوان الدرس مطلوب');
        return;
      }

      const lessonData: any = {
        moduleId,
        title: lessonFormData.title.trim(),
        type: lessonFormData.type,
        durationMinutes: lessonFormData.durationMinutes || undefined,
      };

      if (lessonFormData.type === 'VIDEO' || lessonFormData.type === 'LIVE') {
        if (!lessonFormData.youtubeUrl.trim()) {
          showError('رابط YouTube مطلوب');
          return;
        }
        lessonData.youtubeUrl = lessonFormData.youtubeUrl.trim();
      } else if (lessonFormData.type === 'PLAYLIST') {
        if (!lessonFormData.youtubeUrl.trim()) {
          showError('رابط قائمة التشغيل مطلوب');
          return;
        }
        lessonData.youtubeUrl = lessonFormData.youtubeUrl.trim();
        lessonData.youtubePlaylistId = extractPlaylistId(lessonFormData.youtubeUrl) || lessonFormData.youtubePlaylistId;
      } else if (lessonFormData.type === 'TEXT') {
        if (!lessonFormData.textContent.trim()) {
          showError('محتوى النص مطلوب');
          return;
        }
        lessonData.textContent = lessonFormData.textContent.trim();
      }

      await api.post('/lessons', lessonData);
      setShowLessonForm(null);
      setEditingLesson(null);
      resetLessonForm();
      showSuccess(TOAST_MESSAGES.CREATE_SUCCESS);
      loadData();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.errors?.[0]?.message || 'فشل إضافة الدرس';
      showError(errorMsg);
    }
  };

  const handleEditLesson = (moduleId: string, lesson: Lesson) => {
    setEditingLesson({ moduleId, lesson });
    setShowLessonForm(moduleId);
    setLessonFormData({
      title: lesson.title,
      type: lesson.type as 'VIDEO' | 'TEXT' | 'LIVE' | 'PLAYLIST',
      youtubeUrl: lesson.youtubeUrl || '',
      youtubePlaylistId: lesson.youtubePlaylistId || '',
      textContent: lesson.textContent || '',
      durationMinutes: lesson.durationMinutes || 0,
    });
  };

  const handleUpdateLesson = async (e: React.FormEvent) => {
    if (!editingLesson) return;
    e.preventDefault();
    try {
      if (!lessonFormData.title.trim()) {
        showError('عنوان الدرس مطلوب');
        return;
      }

      const lessonData: any = {
        title: lessonFormData.title.trim(),
        type: lessonFormData.type,
        durationMinutes: lessonFormData.durationMinutes || undefined,
      };

      if (lessonFormData.type === 'VIDEO' || lessonFormData.type === 'LIVE') {
        if (!lessonFormData.youtubeUrl.trim()) {
          showError('رابط YouTube مطلوب');
          return;
        }
        lessonData.youtubeUrl = lessonFormData.youtubeUrl.trim();
      } else if (lessonFormData.type === 'PLAYLIST') {
        if (!lessonFormData.youtubeUrl.trim()) {
          showError('رابط قائمة التشغيل مطلوب');
          return;
        }
        lessonData.youtubeUrl = lessonFormData.youtubeUrl.trim();
        lessonData.youtubePlaylistId = extractPlaylistId(lessonFormData.youtubeUrl) || lessonFormData.youtubePlaylistId;
      } else if (lessonFormData.type === 'TEXT') {
        if (!lessonFormData.textContent.trim()) {
          showError('محتوى النص مطلوب');
          return;
        }
        lessonData.textContent = lessonFormData.textContent.trim();
      }

      await api.put(`/lessons/${editingLesson.lesson.id}`, lessonData);
      setShowLessonForm(null);
      setEditingLesson(null);
      resetLessonForm();
      showSuccess(TOAST_MESSAGES.UPDATE_SUCCESS);
      loadData();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.errors?.[0]?.message || 'فشل تحديث الدرس';
      showError(errorMsg);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    const ok = await confirm({ message: 'هل أنت متأكد من حذف هذا الدرس؟', title: 'حذف الدرس', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/lessons/${lessonId}`);
      showSuccess(TOAST_MESSAGES.DELETE_SUCCESS);
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل حذف الدرس');
    }
  };

  const resetLessonForm = () => {
    setLessonFormData({
      title: '',
      type: 'VIDEO',
      youtubeUrl: '',
      youtubePlaylistId: '',
      textContent: '',
      durationMinutes: 0,
    });
  };

  const handleMoveLessonInModule = async (moduleId: string, lessonIndex: number, direction: 'up' | 'down') => {
    if (!course) return;
    const mod = course.modules.find((m) => m.id === moduleId);
    if (!mod) return;
    const lessons = [...mod.lessons];
    const targetIndex = direction === 'up' ? lessonIndex - 1 : lessonIndex + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;
    // Swap locally
    [lessons[lessonIndex], lessons[targetIndex]] = [lessons[targetIndex], lessons[lessonIndex]];
    // Optimistic update
    setCourse({
      ...course,
      modules: course.modules.map((m) =>
        m.id === moduleId ? { ...m, lessons } : m
      ),
    });
    try {
      await api.put('/lessons/reorder', {
        moduleId,
        lessonIds: lessons.map((l) => l.id),
      });
    } catch (error: any) {
      showError(error.response?.data?.message || 'فشل إعادة ترتيب الدروس');
      loadData();
    }
  };

  const extractYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const extractPlaylistId = (url: string) => {
    // Extract playlist ID from URL like: https://www.youtube.com/watch?v=-3P8qEJlAZw&list=PLFx6fzJ-pragRAu1lrKy59RcfQiI0rq2_
    const match = url.match(/[?&]list=([^#&?]*)/);
    return match ? match[1] : null;
  };

  const getPlaylistEmbedUrl = (url: string) => {
    const playlistId = extractPlaylistId(url);
    if (playlistId) {
      return `https://www.youtube.com/embed/videoseries?list=${playlistId}`;
    }
    return null;
  };

  if (loading && !course) {
    return <PageLoading title="تعديل الدورة" icon={<BookIcon className="text-white" size={20} />} />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition mb-4"
        >
          ← العودة
        </button>
        <h1 className="text-3xl font-bold text-gray-800">تعديل الدورة</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <CollapsibleSection title="المعلومات الأساسية">
            <form onSubmit={handleSubmit} className="space-y-6">

            <div>
              <label className="block text-lg font-semibold mb-2 text-gray-800">عنوان الدورة <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white"
                placeholder="مثال: مبادئ الفقه الإسلامي"
              />
            </div>

            <div>
              <label className="block text-lg font-semibold mb-2 text-gray-800">وصف الدورة</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white"
                placeholder="اكتب وصفاً شاملاً للدورة..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative w-full">
                <label className="block text-lg font-semibold mb-2 text-gray-800">الفئة <span className="text-red-500">*</span></label>
                <div className="relative w-full">
                  <button
                    type="button"
                    onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                    className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium text-right flex items-center justify-between"
                    style={{ minHeight: '56px' }}
                  >
                    <span className="flex-1 text-right">
                      {formData.categoryId 
                        ? categories.find(c => c.id === formData.categoryId)?.title || 'اختر الفئة'
                        : 'اختر الفئة'
                      }
                    </span>
                    <svg 
                      className={`w-5 h-5 transition-transform ${categoryDropdownOpen ? 'transform rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {categoryDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setCategoryDropdownOpen(false)}
                      />
                      <div 
                        className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        style={{ direction: 'rtl' }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, categoryId: '' });
                            setCategoryDropdownOpen(false);
                          }}
                          className={`w-full text-right px-4 py-3 text-lg hover:bg-gray-100 transition ${
                            formData.categoryId === '' ? 'bg-primary text-white' : 'text-gray-800'
                          }`}
                        >
                          اختر الفئة
                        </button>
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, categoryId: cat.id });
                              setCategoryDropdownOpen(false);
                            }}
                            className={`w-full text-right px-4 py-3 text-lg hover:bg-gray-100 transition border-t border-gray-200 ${
                              formData.categoryId === cat.id ? 'bg-primary text-white' : 'text-gray-800'
                            }`}
                          >
                            {cat.title}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-lg font-semibold mb-2 text-gray-800">السعر (ر.س)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-lg font-semibold mb-2 text-gray-800">المساقات السابقة</label>
              <p className="text-sm text-gray-600 mb-3">
                لا يمكن للطالب التسجيل إلا بعد إكمال المساقات السابقة والنجاح بنسبة 60% على الأقل.
              </p>
              <div className="border-2 border-gray-200 rounded-lg p-4 max-h-56 overflow-y-auto bg-white">
                {availablePrerequisites.length === 0 ? (
                  <p className="text-gray-500 text-sm">لا توجد مساقات متاحة لإضافتها.</p>
                ) : (
                  <div className="space-y-2">
                    {availablePrerequisites.map((courseOption) => (
                      <label key={courseOption.id} className="flex items-center gap-3 text-gray-800">
                        <input
                          type="checkbox"
                          checked={selectedPrerequisites.includes(courseOption.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPrerequisites([...selectedPrerequisites, courseOption.id]);
                            } else {
                              setSelectedPrerequisites(
                                selectedPrerequisites.filter((id) => id !== courseOption.id)
                              );
                            }
                          }}
                          className="h-4 w-4 text-primary border-gray-300 rounded"
                        />
                        <span>{courseOption.title}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-lg font-semibold mb-2 text-gray-800">رابط الصورة</label>
              <input
                type="url"
                value={formData.coverImage}
                onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary text-gray-800 bg-white"
                placeholder="https://example.com/image.jpg"
              />
              {formData.coverImage && (
                <div className="mt-4 relative w-full max-w-md h-48 rounded-lg border-2 border-gray-300 overflow-hidden">
                  <Image
                    src={toDirectImageUrl(formData.coverImage) || formData.coverImage}
                    alt="Preview"
                    fill
                    className="object-cover"
                    sizes="(max-width: 448px) 100vw, 448px"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="relative w-full">
              <label className="block text-lg font-semibold mb-2 text-gray-800">الحالة</label>
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium text-right flex items-center justify-between"
                  style={{ minHeight: '56px' }}
                >
                  <span className="flex-1 text-right">
                    {formData.status === 'DRAFT' ? 'مسودة' : 'منشور'}
                  </span>
                  <svg 
                    className={`w-5 h-5 transition-transform ${statusDropdownOpen ? 'transform rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {statusDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setStatusDropdownOpen(false)}
                    />
                    <div 
                      className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg"
                      style={{ direction: 'rtl' }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, status: 'DRAFT' });
                          setStatusDropdownOpen(false);
                        }}
                        className={`w-full text-right px-4 py-3 text-lg hover:bg-gray-100 transition ${
                          formData.status === 'DRAFT' ? 'bg-primary text-white' : 'text-gray-800'
                        }`}
                      >
                        مسودة
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, status: 'PUBLISHED' });
                          setStatusDropdownOpen(false);
                        }}
                        className={`w-full text-right px-4 py-3 text-lg hover:bg-gray-100 transition border-t border-gray-200 ${
                          formData.status === 'PUBLISHED' ? 'bg-primary text-white' : 'text-gray-800'
                        }`}
                      >
                        منشور
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Ongoing toggle */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.lifecycle === 'ONGOING'}
                  onChange={(e) => setFormData({ ...formData, lifecycle: e.target.checked ? 'ONGOING' : 'DEFAULT' })}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-lg font-semibold text-gray-800">دورة وجاهيّة</span>
                  <p className="text-sm text-gray-500">الدروس تُضاف تدريجياً فور تسجيلها</p>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full px-6 py-4 bg-primary text-white rounded-lg font-bold text-lg hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
            </form>
          </CollapsibleSection>

          {/* Weight Allocation */}
          <CollapsibleSection
            title="توزيع أوزان العلامات"
            subtitle="حدد وزن كل عنصر تقييم — يجب أن يكون المجموع 100%"
          >

            {weights ? (
              weights.assessments.length === 0 && weights.readingWeight === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">لا توجد عناصر تقييم بعد</p>
                  <p className="text-sm mt-1">أضف امتحانات أو واجبات أو اختبارات أولاً</p>
                </div>
              ) : (
                <div className="space-y-4 mt-4">
                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">الإجمالي</span>
                      <span className={`text-sm font-bold ${weights.total === 100 ? 'text-emerald-600' : weights.total > 100 ? 'text-red-600' : 'text-amber-600'}`}>
                        {weights.total}%
                        {weights.total !== 100 && <span className="font-normal text-gray-400 mr-1">(المتبقي: {weights.remaining}%)</span>}
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${weights.total === 100 ? 'bg-emerald-500' : weights.total > 100 ? 'bg-red-500' : 'bg-amber-400'}`}
                        style={{ width: `${Math.min(weights.total, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Weight items */}
                  <div className="space-y-2">
                    {/* Reading Weight */}
                    <div className="flex items-center gap-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <BookOpen size={16} className="text-emerald-600" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 flex-1">القراءة والمتابعة</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0" max="100"
                          value={weights.readingWeight}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                            const newWeights = { ...weights, readingWeight: val };
                            newWeights.total = val + newWeights.assessments.reduce((s, a) => s + a.weightPercent, 0);
                            newWeights.isValid = newWeights.total === 100;
                            newWeights.remaining = 100 - newWeights.total;
                            setWeights(newWeights);
                          }}
                          className="w-16 px-2 py-1.5 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-gray-800 font-bold text-sm"
                        />
                        <span className="text-gray-400 text-xs font-medium">%</span>
                      </div>
                    </div>

                    {/* Assessments */}
                    {weights.assessments.map((assessment, index) => (
                      <div key={assessment.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          assessment.type === 'EXAM' ? 'bg-purple-100' : assessment.type === 'HOMEWORK' ? 'bg-orange-100' : 'bg-blue-100'
                        }`}>
                          {assessment.type === 'EXAM' ? <FileText size={16} className="text-purple-600" /> :
                           assessment.type === 'HOMEWORK' ? <ClipboardList size={16} className="text-orange-600" /> :
                           <HelpCircle size={16} className="text-blue-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{assessment.title}</p>
                          <p className="text-xs text-gray-400">{assessment.type === 'EXAM' ? 'امتحان' : assessment.type === 'HOMEWORK' ? 'واجب' : 'اختبار قصير'}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0" max="100"
                            value={assessment.weightPercent}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                              const newAssessments = [...weights.assessments];
                              newAssessments[index] = { ...newAssessments[index], weightPercent: val };
                              const total = weights.readingWeight + newAssessments.reduce((s, a) => s + a.weightPercent, 0);
                              setWeights({ ...weights, assessments: newAssessments, total, isValid: total === 100, remaining: 100 - total });
                            }}
                            className="w-16 px-2 py-1.5 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-gray-800 font-bold text-sm"
                          />
                          <span className="text-gray-400 text-xs font-medium">%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Save button */}
                  <button
                    type="button"
                    disabled={weights.total !== 100 || weightsSaving}
                    onClick={async () => {
                      if (!weights) return;
                      setWeightsSaving(true);
                      try {
                        const courseId = Array.isArray(params.id) ? params.id[0] : params.id;
                        await api.put(`/courses/${courseId}/weights`, {
                          readingWeight: weights.readingWeight,
                          assessments: weights.assessments.map(a => ({ id: a.id, type: a.type, weightPercent: a.weightPercent })),
                        });
                        showSuccess('تم حفظ الأوزان بنجاح');
                        const weightRes = await api.get(`/courses/${courseId}/weight-summary`);
                        setWeights(weightRes.data);
                      } catch (err: any) {
                        showError(err.response?.data?.message || 'فشل في حفظ الأوزان');
                      } finally {
                        setWeightsSaving(false);
                      }
                    }}
                    className={`w-full px-6 py-3 rounded-xl font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
                      weights.total === 100
                        ? 'bg-primary text-white hover:bg-primary-dark'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {weightsSaving ? 'جاري حفظ الأوزان...' : 'حفظ الأوزان'}
                  </button>
                </div>
              )
            ) : (
              <div className="animate-pulse space-y-3 mt-4">
                <div className="h-3 bg-gray-200 rounded-full w-full" />
                <div className="h-12 bg-gray-100 rounded-xl" />
                <div className="h-12 bg-gray-100 rounded-xl" />
                <div className="h-12 bg-gray-100 rounded-xl" />
              </div>
            )}
          </CollapsibleSection>

          {/* Modules and Lessons */}
          <CollapsibleSection
            title="الوحدات والدروس"
            headerAction={
              <button
                onClick={() => setShowModuleForm(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition"
              >
                + إضافة وحدة
              </button>
            }
          >

            {showModuleForm && (
              <form onSubmit={handleAddModule} className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-primary">
                <h3 className="text-xl font-bold mb-4 text-gray-800">وحدة جديدة</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">عنوان الوحدة <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={moduleFormData.title}
                      onChange={(e) => setModuleFormData({ ...moduleFormData, title: e.target.value })}
                      required
                      placeholder="عنوان الوحدة"
                      className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary text-gray-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">رابط قائمة تشغيل YouTube (اختياري)</label>
                    <input
                      type="url"
                      value={moduleFormData.playlistUrl}
                      onChange={(e) => setModuleFormData({ ...moduleFormData, playlistUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=...&list=..."
                      className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary text-gray-800 bg-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      في حال إدخال رابط قائمة تشغيل، سيتم إنشاء درس لكل فيديو في القائمة تلقائياً
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition"
                    >
                      إضافة
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowModuleForm(false); setModuleFormData({ title: '', playlistUrl: '' }); }}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </form>
            )}

            {course?.modules && course.modules.length > 0 && (
              <form
                onSubmit={handleImportLessonsFromPlaylist}
                className="mb-6 p-4 bg-amber-50/90 rounded-lg border-2 border-amber-200"
              >
                <h3 className="text-lg font-bold mb-2 text-gray-800">استيراد دروس من قائمة تشغيل YouTube</h3>
                <p className="text-sm text-gray-600 mb-3">
                  تُضاف الدروس في نهاية الوحدة المختارة (نفس آلية «إنشاء الدورة من قائمة التشغيل» عند إنشاء دورة
                  جديدة).
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
                  <div className="w-full sm:w-auto sm:min-w-[200px]">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">الوحدة</label>
                    <select
                      value={importPlaylistModuleId || course.modules[0]?.id || ''}
                      onChange={(e) => setImportPlaylistModuleId(e.target.value)}
                      className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg bg-white text-gray-800"
                    >
                      {course.modules.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title} ({m.lessons.length} درس)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-0 w-full sm:min-w-[280px]">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">رابط قائمة التشغيل</label>
                    <input
                      type="url"
                      value={importPlaylistUrl}
                      onChange={(e) => setImportPlaylistUrl(e.target.value)}
                      placeholder="https://www.youtube.com/playlist?list=..."
                      className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={importPlaylistLoading}
                    className="w-full sm:w-auto px-6 py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-50 shrink-0"
                  >
                    {importPlaylistLoading ? 'جاري الاستيراد…' : 'استيراد الدروس'}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-6">
              {course?.modules && course.modules.length === 0 ? (
                <p className="text-center py-8 text-gray-500">لا توجد وحدات بعد</p>
              ) : (
                course?.modules.map((mod) => (
                  <div key={mod.id} className="border-2 border-gray-200 rounded-lg p-6 bg-white">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-gray-800">{mod.title}</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowLessonForm(mod.id);
                            setEditingLesson(null);
                            resetLessonForm();
                          }}
                          className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-semibold"
                        >
                          + إضافة درس
                        </button>
                        <button
                          onClick={() => handleDeleteModule(mod.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-semibold"
                        >
                          حذف الوحدة
                        </button>
                      </div>
                    </div>

                    {showLessonForm === mod.id && (
                      <form
                        onSubmit={editingLesson ? handleUpdateLesson : (e) => handleAddLesson(e, mod.id)}
                        className="mb-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-300"
                      >
                        <h4 className="text-lg font-bold mb-3 text-gray-800">{editingLesson ? 'تعديل الدرس' : 'درس جديد'}</h4>
                        <div className="space-y-3">
                          <div>
                            <label htmlFor="lesson-title" className="block text-sm font-semibold text-gray-700 mb-1">عنوان الدرس <span className="text-red-500">*</span></label>
                            <input
                              id="lesson-title"
                              type="text"
                              value={lessonFormData.title}
                              onChange={(e) => setLessonFormData({ ...lessonFormData, title: e.target.value })}
                              required
                              placeholder="عنوان الدرس"
                              className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary text-gray-800 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">نوع الدرس <span className="text-red-500">*</span></label>
                            <LessonTypeDropdown
                              value={lessonFormData.type}
                              onChange={(type) => setLessonFormData({ ...lessonFormData, type: type as 'VIDEO' | 'TEXT' | 'LIVE' | 'PLAYLIST' })}
                            />
                          </div>
                          {lessonFormData.type === 'VIDEO' && (
                            <>
                              <div>
                                <label htmlFor="lesson-youtube-url" className="block text-sm font-semibold text-gray-700 mb-1">رابط YouTube <span className="text-red-500">*</span></label>
                                <input
                                  id="lesson-youtube-url"
                                  type="url"
                                  value={lessonFormData.youtubeUrl}
                                  onChange={(e) => setLessonFormData({ ...lessonFormData, youtubeUrl: e.target.value })}
                                  required
                                  placeholder="رابط YouTube (مثال: https://www.youtube.com/watch?v=...)"
                                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary text-gray-800 bg-white"
                                />
                              </div>
                              {lessonFormData.youtubeUrl && extractYouTubeId(lessonFormData.youtubeUrl) && (
                                <div className="mt-2">
                                  <iframe
                                    width="100%"
                                    height="200"
                                    src={`https://www.youtube.com/embed/${extractYouTubeId(lessonFormData.youtubeUrl)}`}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="rounded-lg"
                                  ></iframe>
                                </div>
                              )}
                            </>
                          )}
                          {lessonFormData.type === 'PLAYLIST' && (
                            <>
                              <div>
                                <label htmlFor="lesson-playlist-url" className="block text-sm font-semibold text-gray-700 mb-1">رابط قائمة التشغيل <span className="text-red-500">*</span></label>
                                <input
                                  id="lesson-playlist-url"
                                  type="url"
                                  value={lessonFormData.youtubeUrl}
                                  onChange={(e) => setLessonFormData({ ...lessonFormData, youtubeUrl: e.target.value })}
                                  required
                                  placeholder="رابط قائمة التشغيل (مثال: https://www.youtube.com/watch?v=...&list=...)"
                                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary text-gray-800 bg-white"
                                />
                              </div>
                              {lessonFormData.youtubeUrl && getPlaylistEmbedUrl(lessonFormData.youtubeUrl) && (
                                <div className="mt-2">
                                  <iframe
                                    width="100%"
                                    height="300"
                                    src={getPlaylistEmbedUrl(lessonFormData.youtubeUrl)!}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="rounded-lg"
                                  ></iframe>
                                  <p className="text-sm text-gray-600 mt-2">
                                    قائمة تشغيل: {extractPlaylistId(lessonFormData.youtubeUrl)}
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                          {lessonFormData.type === 'TEXT' && (
                            <div>
                              <label htmlFor="lesson-text-content" className="block text-sm font-semibold text-gray-700 mb-1">محتوى النص <span className="text-red-500">*</span></label>
                              <textarea
                                id="lesson-text-content"
                                value={lessonFormData.textContent}
                                onChange={(e) => setLessonFormData({ ...lessonFormData, textContent: e.target.value })}
                                required
                                rows={6}
                                placeholder="محتوى النص"
                                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary text-gray-800 bg-white"
                              />
                            </div>
                          )}
                          {lessonFormData.type === 'LIVE' && (
                            <div>
                              <label htmlFor="lesson-live-url" className="block text-sm font-semibold text-gray-700 mb-1">رابط البث المباشر <span className="text-red-500">*</span></label>
                              <input
                                id="lesson-live-url"
                                type="url"
                                value={lessonFormData.youtubeUrl}
                                onChange={(e) => setLessonFormData({ ...lessonFormData, youtubeUrl: e.target.value })}
                                required
                                placeholder="رابط البث المباشر"
                                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary text-gray-800 bg-white"
                              />
                            </div>
                          )}
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label htmlFor="lesson-duration" className="block text-sm font-semibold text-gray-700 mb-1">المدة بالدقائق</label>
                              <input
                                id="lesson-duration"
                                type="number"
                                value={lessonFormData.durationMinutes}
                                onChange={(e) =>
                                  setLessonFormData({ ...lessonFormData, durationMinutes: parseInt(e.target.value) || 0 })
                                }
                                min="0"
                                placeholder="المدة بالدقائق (اختياري)"
                                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary"
                              />
                            </div>
                            <button
                              type="submit"
                              className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition"
                            >
                              {editingLesson ? 'تحديث' : 'إضافة'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowLessonForm(null);
                                setEditingLesson(null);
                                resetLessonForm();
                              }}
                              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      </form>
                    )}

                    <div className="space-y-3">
                      {mod.lessons.length === 0 ? (
                        <p className="text-center py-4 text-gray-500">لا توجد دروس في هذه الوحدة</p>
                      ) : (
                        mod.lessons.map((lesson) => (
                          <div key={lesson.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-start">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-gray-600 font-semibold text-sm">{lesson.order}</span>
                                </div>
                                <div className="flex-1">
                                <h4 className="font-semibold text-lg text-gray-800">{lesson.title}</h4>
                                <div className="mt-2 text-sm text-gray-700">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                    {lesson.type === 'VIDEO' ? 'فيديو' : lesson.type === 'PLAYLIST' ? 'قائمة تشغيل' : lesson.type === 'TEXT' ? 'نص' : 'بث مباشر'}
                                  </span>
                                  {lesson.durationMinutes && (
                                    <span className="mr-2">• {lesson.durationMinutes} دقيقة</span>
                                  )}
                                </div>
                                {lesson.youtubeUrl && lesson.type === 'VIDEO' && (
                                  <div className="mt-3">
                                    <iframe
                                      width="100%"
                                      height="200"
                                      src={
                                        lesson.youtubeUrl.includes('embed')
                                          ? lesson.youtubeUrl
                                          : `https://www.youtube.com/embed/${extractYouTubeId(lesson.youtubeUrl) || ''}`
                                      }
                                      frameBorder="0"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                      className="rounded-lg"
                                    ></iframe>
                                  </div>
                                )}
                                {lesson.youtubeUrl && lesson.type === 'PLAYLIST' && (
                                  <div className="mt-3">
                                    <iframe
                                      width="100%"
                                      height="300"
                                      src={
                                        lesson.youtubePlaylistId
                                          ? `https://www.youtube.com/embed/videoseries?list=${lesson.youtubePlaylistId}`
                                          : getPlaylistEmbedUrl(lesson.youtubeUrl) || ''
                                      }
                                      frameBorder="0"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                      className="rounded-lg"
                                    ></iframe>
                                    {lesson.youtubePlaylistId && (
                                      <p className="text-sm text-gray-600 mt-2">
                                        قائمة تشغيل: {lesson.youtubePlaylistId}
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {/* Lesson Resources Section */}
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <div className="flex justify-between items-center mb-3">
                                    <h5 className="text-sm font-bold text-gray-700">
                                      مواد الدرس {lesson.resources && lesson.resources.length > 0 && `(${lesson.resources.length})`}
                                    </h5>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingLessonResource(null);
                                        setShowLessonResourceForm(lesson.id);
                                      }}
                                      className="px-3 py-1 bg-teal-100 text-teal-700 rounded hover:bg-teal-200 transition text-sm font-semibold"
                                    >
                                      + إضافة مادة
                                    </button>
                                  </div>
                                  
                                  {showLessonResourceForm === lesson.id && (
                                    <div className="mb-3">
                                      <ResourceForm
                                        initialData={editingLessonResource?.lessonId === lesson.id ? editingLessonResource.resource : undefined}
                                        onSubmit={
                                          editingLessonResource?.lessonId === lesson.id
                                            ? handleUpdateLessonResource
                                            : (data) => handleAddLessonResource(lesson.id, data)
                                        }
                                        onCancel={() => {
                                          setShowLessonResourceForm(null);
                                          setEditingLessonResource(null);
                                        }}
                                        isEditing={editingLessonResource?.lessonId === lesson.id}
                                      />
                                    </div>
                                  )}
                                  
                                  {lesson.resources && lesson.resources.length > 0 ? (
                                    <ResourceList
                                      resources={lesson.resources}
                                      showActions={true}
                                      onEdit={(resource) => {
                                        setEditingLessonResource({ lessonId: lesson.id, resource });
                                        setShowLessonResourceForm(lesson.id);
                                      }}
                                      onDelete={(resourceId) => handleDeleteLessonResource(lesson.id, resourceId)}
                                    />
                                  ) : (
                                    <p className="text-sm text-gray-500">لا توجد مواد لهذا الدرس</p>
                                  )}
                                </div>
                              </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleMoveLessonInModule(mod.id, mod.lessons.indexOf(lesson), 'up')}
                                    disabled={mod.lessons.indexOf(lesson) === 0}
                                    className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="نقل لأعلى"
                                  >
                                    <ArrowUp size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleMoveLessonInModule(mod.id, mod.lessons.indexOf(lesson), 'down')}
                                    disabled={mod.lessons.indexOf(lesson) === mod.lessons.length - 1}
                                    className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="نقل لأسفل"
                                  >
                                    <ArrowDown size={16} />
                                  </button>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditLesson(mod.id, lesson)}
                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm font-semibold"
                                  >
                                    تعديل
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLesson(lesson.id)}
                                    className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm font-semibold"
                                  >
                                    حذف
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CollapsibleSection>

          {/* Exams Section */}
          <CollapsibleSection
            title="الامتحانات"
            headerAction={
              <button
                onClick={() => setShowExamForm(true)}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition font-semibold"
              >
                + إضافة امتحان
              </button>
            }
          >

            {showExamForm && (
              <form onSubmit={handleAddExam} className="mb-6 p-4 bg-purple-50 rounded-lg border-2 border-purple-300">
                <h3 className="text-xl font-bold mb-4 text-gray-800">امتحان جديد</h3>
                {/* Import from JSON file toggle */}
                <div className="mb-4 p-3 bg-white rounded-lg border border-purple-200">
                  <label className="flex items-center justify-between cursor-pointer select-none">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">استيراد من ملف JSON</p>
                        <p className="text-xs text-gray-400">استيراد الأسئلة من ملف JSON المُصدّر عبر Apps Script</p>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={importFromJson}
                        onChange={(e) => setImportFromJson(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-gray-300 peer-checked:bg-purple-600 rounded-full transition-colors duration-200" />
                      <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 peer-checked:-translate-x-4" />
                    </div>
                  </label>
                  {importFromJson && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <label htmlFor="exam-json-url" className="block text-sm font-semibold text-gray-700 mb-1">
                        رابط ملف JSON <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        id="exam-json-url"
                        value={jsonUrl}
                        onChange={(e) => setJsonUrl(e.target.value)}
                        required
                        placeholder="https://drive.google.com/file/d/... أو رابط مباشر لملف JSON"
                        className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-purple-400 text-gray-800 bg-white"
                        dir="ltr"
                      />
                      <p className="text-xs text-gray-400 mt-1">رابط ملف JSON المُصدّر عبر Apps Script (يدعم روابط Google Drive)</p>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="exam-title" className="block text-sm font-semibold text-gray-700 mb-1">
                      عنوان الامتحان {!importFromJson && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      id="exam-title"
                      value={examFormData.title}
                      onChange={(e) => setExamFormData({ ...examFormData, title: e.target.value })}
                      required={!importFromJson}
                      placeholder={importFromJson ? "عنوان الامتحان (اختياري - سيؤخذ من الملف)" : "عنوان الامتحان"}
                      className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary text-gray-800 bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="exam-description" className="block text-sm font-semibold text-gray-700 mb-1">
                      وصف الامتحان (اختياري)
                    </label>
                    <textarea
                      id="exam-description"
                      value={examFormData.description}
                      onChange={(e) => setExamFormData({ ...examFormData, description: e.target.value })}
                      placeholder="وصف الامتحان (اختياري)"
                      rows={3}
                      className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary text-gray-800 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="exam-duration" className="block text-sm font-semibold text-gray-700 mb-1">
                        المدة بالدقائق <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="exam-duration"
                        value={examFormData.durationMinutes}
                        onChange={(e) => setExamFormData({ ...examFormData, durationMinutes: parseInt(e.target.value) || 60 })}
                        min="1"
                        placeholder="المدة بالدقائق"
                        className="px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary text-gray-800 bg-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="exam-maxScore" className="block text-sm font-semibold text-gray-700 mb-1">
                        الدرجة الكاملة <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="exam-maxScore"
                        value={examFormData.maxScore}
                        onChange={(e) => setExamFormData({ ...examFormData, maxScore: parseInt(e.target.value) || 100 })}
                        min="1"
                        placeholder="الدرجة الكاملة"
                        className="px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary text-gray-800 bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="exam-startDate" className="block text-sm font-semibold text-gray-700 mb-1">
                        تاريخ البداية <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        id="exam-startDate"
                        value={examFormData.startDate}
                        onChange={(e) => setExamFormData({ ...examFormData, startDate: e.target.value })}
                        required
                        className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary text-gray-800 bg-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="exam-endDate" className="block text-sm font-semibold text-gray-700 mb-1">
                        تاريخ النهاية <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        id="exam-endDate"
                        value={examFormData.endDate}
                        onChange={(e) => setExamFormData({ ...examFormData, endDate: e.target.value })}
                        required
                        className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary text-gray-800 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="exam-passingScore" className="block text-sm font-semibold text-gray-700 mb-1">
                      درجة النجاح
                    </label>
                    <input
                      type="number"
                      id="exam-passingScore"
                      value={examFormData.passingScore}
                      onChange={(e) => setExamFormData({ ...examFormData, passingScore: parseInt(e.target.value) || 60 })}
                      min="0"
                      max={examFormData.maxScore}
                      className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary text-gray-800 bg-white"
                    />
                  </div>
                  {/* Retake Settings */}
                  <div className="border-t border-gray-200 pt-4 mt-2">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                      </svg>
                      <h4 className="text-sm font-bold text-gray-700">إعدادات الإعادة</h4>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                      <label className="flex items-center justify-between cursor-pointer select-none">
                        <div>
                          <p className="text-sm font-semibold text-gray-700">إعادة حتى النجاح</p>
                          <p className="text-xs text-gray-400 mt-0.5">السماح بالإعادة بدون حد</p>
                        </div>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={examFormData.maxAttempts === 0}
                            onChange={(e) => setExamFormData({ ...examFormData, maxAttempts: e.target.checked ? 0 : 2 })}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-6 bg-gray-300 peer-checked:bg-primary rounded-full transition-colors duration-200" />
                          <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 peer-checked:-translate-x-4" />
                        </div>
                      </label>
                      {examFormData.maxAttempts !== 0 && (
                        <div className="border-t border-gray-200 pt-3">
                          <label className="block text-sm font-semibold text-gray-700 mb-1">عدد المحاولات</label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setExamFormData({ ...examFormData, maxAttempts: Math.max(1, examFormData.maxAttempts - 1) })}
                              className="w-8 h-8 rounded-lg border-2 border-gray-300 bg-white text-gray-600 font-bold hover:border-primary hover:text-primary transition flex items-center justify-center"
                            >
                              −
                            </button>
                            <span className="w-10 text-center text-lg font-bold text-gray-800">{examFormData.maxAttempts}</span>
                            <button
                              type="button"
                              onClick={() => setExamFormData({ ...examFormData, maxAttempts: examFormData.maxAttempts + 1 })}
                              className="w-8 h-8 rounded-lg border-2 border-gray-300 bg-white text-gray-600 font-bold hover:border-primary hover:text-primary transition flex items-center justify-center"
                            >
                              +
                            </button>
                            <span className="text-xs text-gray-400 mr-1">
                              {examFormData.maxAttempts === 1 ? 'محاولة واحدة فقط' : `${examFormData.maxAttempts - 1} إعادة مسموحة`}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="border-t border-gray-200 pt-3">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">نسبة احتساب درجة الإعادة</label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1 max-w-[140px]">
                            <input
                              type="number"
                              value={examFormData.retakeScorePercent}
                              onChange={(e) => setExamFormData({ ...examFormData, retakeScorePercent: Math.max(1, Math.min(100, parseInt(e.target.value) || 75)) })}
                              min="1"
                              max="100"
                              className="w-full px-3 py-2 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary pl-8"
                            />
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">%</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            = {Math.round(examFormData.maxScore * (examFormData.retakeScorePercent / 100))} كحد أقصى
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={importingExam}
                      className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {importingExam ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          جاري الاستيراد...
                        </>
                      ) : importFromJson ? 'استيراد وإنشاء' : 'إضافة'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowExamForm(false); resetExamForm(); }}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {exams.length === 0 ? (
                <p className="text-center py-8 text-gray-500">لا توجد امتحانات</p>
              ) : (
                exams.map((exam) => (
                  <div key={exam.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-lg text-gray-800">{exam.title}</h4>
                        {exam.description && (
                          <p className="text-sm text-gray-700 mt-1">{exam.description}</p>
                        )}
                        <div className="mt-2 text-sm text-gray-700">
                          <span>الدرجة الكاملة: {exam.maxScore}</span>
                          <span className="mr-4">
                            • من <span dir="ltr">{formatDateTime(exam.startDate)}</span>
                          </span>
                          <span>
                            إلى <span dir="ltr">{formatDateTime(exam.endDate)}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/exams/${exam.id}`}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm font-semibold"
                        >
                          إدارة
                        </Link>
                        <button
                          onClick={() => handleDeleteExam(exam.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm font-semibold"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CollapsibleSection>

          {/* Homework Section */}
          <CollapsibleSection
            title="الواجبات"
            headerAction={
              <button
                onClick={() => setShowHomeworkForm(true)}
                className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition font-semibold"
              >
                + إضافة واجب
              </button>
            }
          >

            {showHomeworkForm && (
              <form onSubmit={handleAddHomework} className="mb-6 p-4 bg-orange-50 rounded-lg border-2 border-orange-300">
                <h3 className="text-xl font-bold mb-4 text-gray-800">واجب جديد</h3>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="homework-title" className="block text-sm font-semibold text-gray-700 mb-1">
                      عنوان الواجب <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="homework-title"
                      value={homeworkFormData.title}
                      onChange={(e) => setHomeworkFormData({ ...homeworkFormData, title: e.target.value })}
                      required
                      placeholder="عنوان الواجب"
                      className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary text-gray-800 bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="homework-description" className="block text-sm font-semibold text-gray-700 mb-1">
                      وصف الواجب <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="homework-description"
                      value={homeworkFormData.description}
                      onChange={(e) => setHomeworkFormData({ ...homeworkFormData, description: e.target.value })}
                      required
                      placeholder="وصف الواجب"
                      rows={4}
                      className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary text-gray-800 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="homework-dueDate" className="block text-sm font-semibold text-gray-700 mb-1">
                        تاريخ الإنتهاء <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        id="homework-dueDate"
                        value={homeworkFormData.dueDate}
                        onChange={(e) => setHomeworkFormData({ ...homeworkFormData, dueDate: e.target.value })}
                        required
                        className="px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary text-gray-800 bg-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="homework-maxScore" className="block text-sm font-semibold text-gray-700 mb-1">
                        الدرجة الكاملة <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="homework-maxScore"
                        value={homeworkFormData.maxScore}
                        onChange={(e) => setHomeworkFormData({ ...homeworkFormData, maxScore: parseInt(e.target.value) || 100 })}
                        min="1"
                        placeholder="الدرجة الكاملة"
                        className="px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary text-gray-800 bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition"
                    >
                      إضافة
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowHomeworkForm(false)}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {homeworks.length === 0 ? (
                <p className="text-center py-8 text-gray-500">لا توجد واجبات</p>
              ) : (
                homeworks.map((homework) => (
                  <div key={homework.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-lg">{homework.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{homework.description}</p>
                        <div className="mt-2 text-sm text-gray-600">
                          <span>الدرجة الكاملة: {homework.maxScore}</span>
                          <span className="mr-4">• تاريخ الاستحقاق: {formatDate(homework.dueDate)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/homework/${homework.id}/submissions`}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition text-sm font-semibold"
                        >
                          تصحيح
                        </Link>
                        <button
                          onClick={() => handleDeleteHomework(homework.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm font-semibold"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CollapsibleSection>

          {/* Course Resources Section */}
          <CollapsibleSection
            title="مواد الدورة"
            headerAction={
              <button
                onClick={() => {
                  setEditingCourseResource(null);
                  setShowCourseResourceForm(true);
                }}
                className="px-4 py-2 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition font-semibold"
              >
                + إضافة مادة
              </button>
            }
          >

            {showCourseResourceForm && (
              <div className="mb-6">
                <ResourceForm
                  initialData={editingCourseResource || undefined}
                  onSubmit={editingCourseResource ? handleUpdateCourseResource : handleAddCourseResource}
                  onCancel={() => {
                    setShowCourseResourceForm(false);
                    setEditingCourseResource(null);
                  }}
                  isEditing={!!editingCourseResource}
                />
              </div>
            )}

            <ResourceList
              resources={courseResources}
              showActions={true}
              onEdit={handleEditCourseResource}
              onDelete={handleDeleteCourseResource}
              emptyMessage="لا توجد مواد للدورة"
            />
          </CollapsibleSection>
        </div>

        {/* Sidebar - Course Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4 space-y-6">
            <div>
              <h3 className="text-xl font-bold mb-4 text-gray-800">معلومات الدورة</h3>
              <div className="space-y-3 text-sm">
                <div className="relative">
                  <span className="font-semibold text-gray-700">المدرس:</span>
                  {teachers.length > 0 ? (
                    <>
                      <button
                        type="button"
                        disabled={savingTeacher}
                        onClick={() => setTeacherDropdownOpen(!teacherDropdownOpen)}
                        className={`w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 text-right flex items-center justify-between text-sm hover:border-primary transition ${savingTeacher ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className="truncate">
                          {savingTeacher ? 'جاري الحفظ...' : (
                            selectedTeacherId
                              ? teachers.find(t => t.id === selectedTeacherId)?.name || 'اختر مدرس'
                              : 'اختر مدرس'
                          )}
                        </span>
                        <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${teacherDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {teacherDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setTeacherDropdownOpen(false)} />
                          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {teachers.map((teacher) => (
                              <button
                                key={teacher.id}
                                type="button"
                                onClick={async () => {
                                  setTeacherDropdownOpen(false);
                                  if (teacher.id === selectedTeacherId) return;
                                  setSavingTeacher(true);
                                  try {
                                    const courseId = Array.isArray(params.id) ? params.id[0] : params.id;
                                    await api.put(`/courses/${courseId}`, { teacherId: teacher.id });
                                    setSelectedTeacherId(teacher.id);
                                    setCourse(prev => prev ? { ...prev, teacher: { id: teacher.id, name: teacher.name, email: '' } } : prev);
                                    showSuccess('تم تغيير المدرس بنجاح');
                                  } catch (error: any) {
                                    console.error('Failed to update teacher:', error);
                                    showError(error.response?.data?.message || 'فشل تغيير المدرس');
                                  } finally {
                                    setSavingTeacher(false);
                                  }
                                }}
                                className={`w-full text-right px-3 py-2 text-sm hover:bg-gray-100 transition ${
                                  selectedTeacherId === teacher.id ? 'bg-primary text-white' : 'text-gray-800'
                                }`}
                              >
                                {teacher.name}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-800">{course?.teacher?.name || 'غير محدد'}</p>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-gray-700">التسجيلات:</span>
                  <p className="text-gray-800">{course?._count?.enrollments || 0}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">الوحدات:</span>
                  <p className="text-gray-800">{course?.modules?.length || 0}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">الدروس:</span>
                  <p className="text-gray-800">
                    {course?.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">الامتحانات:</span>
                  <p className="text-gray-800">{exams.length}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">الواجبات:</span>
                  <p className="text-gray-800">{homeworks.length}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">المواد:</span>
                  <p className="text-gray-800">{courseResources.length}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">مواد الدروس:</span>
                  <p className="text-gray-800">
                    {course?.modules?.reduce(
                      (sum, m) => sum + m.lessons.reduce((lSum, l) => lSum + (l.resources?.length || 0), 0),
                      0
                    ) || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-lg font-bold mb-3 text-gray-800">توزيع أوزان العلامات</h3>
              {weights ? (
                <div className="space-y-2">
                  {/* Mini progress bar */}
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${weights.total === 100 ? 'bg-emerald-500' : weights.total > 100 ? 'bg-red-500' : 'bg-amber-400'}`}
                      style={{ width: `${Math.min(weights.total, 100)}%` }}
                    />
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                        <span className="text-gray-600">القراءة</span>
                      </div>
                      <span className="font-bold text-gray-800">{weights.readingWeight}%</span>
                    </div>
                    {weights.assessments.map((a) => (
                      <div key={a.id} className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${a.type === 'EXAM' ? 'bg-purple-500' : a.type === 'HOMEWORK' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                          <span className="text-gray-600 truncate max-w-[110px]">{a.title}</span>
                        </div>
                        <span className="font-bold text-gray-800">{a.weightPercent}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 mt-1 border-t border-gray-200">
                    <div className={`flex justify-between font-bold text-sm ${weights.isValid ? 'text-emerald-600' : 'text-red-600'}`}>
                      <span>المجموع</span>
                      <span>{weights.total}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-pulse space-y-2">
                  <div className="h-2 bg-gray-200 rounded-full" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog isOpen={confirmOpen} onClose={handleConfirmClose} onConfirm={handleConfirm} {...confirmOptions} />
    </div>
  );
}
