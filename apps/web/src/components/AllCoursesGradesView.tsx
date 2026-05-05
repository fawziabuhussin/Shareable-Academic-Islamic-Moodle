'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { StarIcon } from '@/components/Icons';
import PageLoading from '@/components/PageLoading';
import { getLetterGrade, getLetterGradeColor, getGradeCellBg } from '@/lib/grades';
import { ArrowUpDown, ArrowUp, ArrowDown, Check, ChevronDown, X, Download } from 'lucide-react';
import { exportAllCoursesGrades } from '@/lib/excelExport';
import { showSuccess, showError } from '@/lib/toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CourseInfo {
  id: string;
  title: string;
}

interface CourseGradeEntry {
  effectiveScore: number | null;
  letterGrade: string | null;
  isFinalized: boolean;
}

interface StudentRow {
  userId: string;
  studentName: string;
  studentEmail: string;
  courseGrades: Record<string, CourseGradeEntry>;
}

interface AllCoursesGradesData {
  courses: CourseInfo[];
  students: StudentRow[];
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AllCoursesGradesViewProps {
  backHref: string;
  courseDetailHrefPrefix: string; // e.g. "/admin/grades" or "/teacher/grades"
}

// ── Sort helpers ──────────────────────────────────────────────────────────────

type SortKey = 'name' | string; // 'name' or courseId
type SortDir = 'asc' | 'desc';

function compareSorted(a: StudentRow, b: StudentRow, key: SortKey, dir: SortDir): number {
  let cmp = 0;
  if (key === 'name') {
    cmp = a.studentName.localeCompare(b.studentName, 'ar');
  } else {
    const aScore = a.courseGrades[key]?.effectiveScore ?? null;
    const bScore = b.courseGrades[key]?.effectiveScore ?? null;
    // nulls always last regardless of direction
    if (aScore === null && bScore === null) cmp = 0;
    else if (aScore === null) return 1;
    else if (bScore === null) return -1;
    else cmp = aScore - bScore;
  }
  return dir === 'asc' ? cmp : -cmp;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AllCoursesGradesView({
  backHref,
  courseDetailHrefPrefix,
}: AllCoursesGradesViewProps) {
  const [data, setData] = useState<AllCoursesGradesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Course filter
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/grades/all-courses');
      const payload: AllCoursesGradesData = res.data;
      setData(payload);
      // Initially select all courses
      setSelectedCourseIds(new Set(payload.courses.map((c) => c.id)));
    } catch (err: any) {
      console.error('Failed to load all-courses grades:', err);
      setError(err.response?.data?.message || 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  // Filtered courses
  const visibleCourses = useMemo(() => {
    if (!data) return [];
    return data.courses.filter((c) => selectedCourseIds.has(c.id));
  }, [data, selectedCourseIds]);

  // Sorted students — only include students who have at least one visible course grade
  const sortedStudents = useMemo(() => {
    if (!data) return [];
    const filtered = data.students.filter((s) =>
      visibleCourses.some((c) => s.courseGrades[c.id] !== undefined)
    );
    return [...filtered].sort((a, b) => compareSorted(a, b, sortKey, sortDir));
  }, [data, visibleCourses, sortKey, sortDir]);

  // Toggle sort
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return <ArrowUpDown size={12} className="opacity-40" />;
    return sortDir === 'asc' ? (
      <ArrowUp size={12} className="text-emerald-600" />
    ) : (
      <ArrowDown size={12} className="text-emerald-600" />
    );
  };

  // Course filter helpers
  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (data) setSelectedCourseIds(new Set(data.courses.map((c) => c.id)));
  };

  const deselectAll = () => {
    setSelectedCourseIds(new Set());
  };

  // Filtered list for the search inside selector
  const filteredCoursesForSelector = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data.courses;
    return data.courses.filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  if (loading) {
    return <PageLoading title="نظرة شاملة للدرجات" icon={<StarIcon size={24} />} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-8 text-center max-w-md">
          <p className="text-red-600 font-medium mb-2">خطأ</p>
          <p className="text-stone-600">{error}</p>
          <Link href={backHref} className="mt-4 inline-block text-[#1a3a2f] font-medium hover:underline">
            العودة ←
          </Link>
        </div>
      </div>
    );
  }

  if (!data || data.courses.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header backHref={backHref} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center">
            <p className="text-stone-500">لا توجد دورات متاحة حالياً</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Header backHref={backHref} />

      <div className="max-w-[95vw] xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Stats bar */}
        <div className="flex flex-wrap gap-3">
          <StatCard label="الدورات" value={data.courses.length} />
          <StatCard label="الطلاب" value={data.students.length} />
          <StatCard
            label="الدورات المعروضة"
            value={`${selectedCourseIds.size} / ${data.courses.length}`}
          />
          <button
            onClick={async () => {
              if (!data) return;
              setExporting(true);
              try {
                await exportAllCoursesGrades(data, selectedCourseIds);
                showSuccess('تم تصدير الملف بنجاح');
              } catch (err) {
                console.error('Excel export failed:', err);
                showError('فشل في تصدير الملف');
              } finally {
                setExporting(false);
              }
            }}
            disabled={exporting}
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            <Download size={16} />
            {exporting ? 'جاري التصدير...' : 'تصدير إكسل'}
          </button>
        </div>

        {/* Course selector */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 transition shadow-sm"
          >
            <span>اختيار الدورات المعروضة</span>
            <span className="bg-[#1a3a2f] text-white text-xs rounded-full px-2 py-0.5">
              {selectedCourseIds.size}
            </span>
            <ChevronDown size={16} className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>

          {filterOpen && (
            <div className="absolute z-50 mt-2 w-96 max-w-[90vw] bg-white border border-stone-200 rounded-xl shadow-lg">
              {/* Search */}
              <div className="p-3 border-b border-stone-100">
                <input
                  type="text"
                  placeholder="بحث عن دورة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2f]/20"
                />
              </div>

              {/* Select/Deselect all */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-stone-100">
                <button onClick={selectAll} className="text-xs text-[#1a3a2f] font-medium hover:underline">
                  تحديد الكل
                </button>
                <span className="text-stone-300">|</span>
                <button onClick={deselectAll} className="text-xs text-red-500 font-medium hover:underline">
                  إلغاء الكل
                </button>
              </div>

              {/* Course list */}
              <div className="max-h-60 overflow-y-auto p-2">
                {filteredCoursesForSelector.map((course) => {
                  const isSelected = selectedCourseIds.has(course.id);
                  return (
                    <button
                      key={course.id}
                      onClick={() => toggleCourse(course.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-right transition ${
                        isSelected ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-stone-50 text-stone-600'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#1a3a2f] border-[#1a3a2f]' : 'border-stone-300'
                        }`}
                      >
                        {isSelected && <Check size={10} className="text-white" />}
                      </span>
                      <span className="truncate">{course.title}</span>
                    </button>
                  );
                })}
                {filteredCoursesForSelector.length === 0 && (
                  <p className="text-xs text-stone-400 text-center py-3">لا توجد نتائج</p>
                )}
              </div>

              {/* Close */}
              <div className="p-2 border-t border-stone-100">
                <button
                  onClick={() => { setFilterOpen(false); setSearchQuery(''); }}
                  className="w-full py-2 text-sm font-medium text-stone-600 hover:text-stone-800 transition"
                >
                  إغلاق
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Close overlay on outside click */}
        {filterOpen && (
          <div className="fixed inset-0 z-40" onClick={() => { setFilterOpen(false); setSearchQuery(''); }} />
        )}

        {/* Grades matrix table */}
        {visibleCourses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center">
            <p className="text-stone-500">اختر دورة واحدة على الأقل لعرض الدرجات</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    {/* Sticky student name column */}
                    <th
                      className="sticky right-0 z-20 bg-stone-50 px-4 py-3 text-right font-semibold text-stone-700 cursor-pointer hover:bg-stone-100 transition min-w-[200px] border-l border-stone-200"
                      onClick={() => toggleSort('name')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>الطالب</span>
                        <SortIcon columnKey="name" />
                      </div>
                    </th>
                    {/* Course columns */}
                    {visibleCourses.map((course) => (
                      <th
                        key={course.id}
                        className="px-3 py-3 text-center font-semibold text-stone-700 cursor-pointer hover:bg-stone-100 transition min-w-[140px] border-l border-stone-100"
                        onClick={() => toggleSort(course.id)}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`${courseDetailHrefPrefix}/${course.id}`}
                            className="hover:text-[#1a3a2f] hover:underline truncate max-w-[120px]"
                            title={course.title}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {course.title}
                          </Link>
                          <SortIcon columnKey={course.id} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={visibleCourses.length + 1}
                        className="px-4 py-8 text-center text-stone-400"
                      >
                        لا يوجد طلاب مسجلين في الدورات المختارة
                      </td>
                    </tr>
                  ) : (
                    sortedStudents.map((student, idx) => (
                      <tr
                        key={student.userId}
                        className={`border-b border-stone-100 ${idx % 2 === 0 ? '' : 'bg-stone-50/50'}`}
                      >
                        {/* Sticky student name */}
                        <td
                          className={`sticky right-0 z-10 px-4 py-3 border-l border-stone-200 ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-stone-50'
                          }`}
                        >
                          <div className="font-medium text-stone-800 truncate max-w-[200px]" title={student.studentName}>
                            {student.studentName}
                          </div>
                          <div className="text-xs text-stone-400 truncate max-w-[200px]" dir="ltr">
                            {student.studentEmail}
                          </div>
                        </td>
                        {/* Grade cells */}
                        {visibleCourses.map((course) => {
                          const entry = student.courseGrades[course.id];
                          if (!entry) {
                            // Not enrolled
                            return (
                              <td key={course.id} className="px-3 py-3 text-center border-l border-stone-100">
                                <span className="text-stone-300">—</span>
                              </td>
                            );
                          }
                          if (entry.effectiveScore === null) {
                            // Enrolled but not finalized
                            return (
                              <td key={course.id} className="px-3 py-3 text-center border-l border-stone-100">
                                <span className="text-stone-400 text-xs">غير معتمد</span>
                              </td>
                            );
                          }
                          const letterGrade = entry.letterGrade || getLetterGrade(entry.effectiveScore);
                          const cellBg = getGradeCellBg(letterGrade);
                          return (
                            <td key={course.id} className={`px-3 py-3 text-center border-l border-stone-100 ${cellBg}`}>
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="font-semibold text-stone-800">
                                  {entry.effectiveScore.toFixed(1)}%
                                </span>
                                <span className="text-xs font-medium text-stone-600">
                                  {letterGrade}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Averages footer row */}
                {sortedStudents.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-stone-300 bg-stone-100">
                      <td className="sticky right-0 z-10 bg-stone-100 px-4 py-3 border-l border-stone-200 font-bold text-stone-700">
                        المعدل العام
                      </td>
                      {visibleCourses.map((course) => {
                        const scores = sortedStudents
                          .map((s) => s.courseGrades[course.id]?.effectiveScore)
                          .filter((s): s is number => s != null);
                        if (scores.length === 0) {
                          return (
                            <td key={course.id} className="px-3 py-3 text-center border-l border-stone-200">
                              <span className="text-stone-400">—</span>
                            </td>
                          );
                        }
                        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                        const letterGrade = getLetterGrade(avg);
                        const cellBg = getGradeCellBg(letterGrade);
                        return (
                          <td key={course.id} className={`px-3 py-3 text-center border-l border-stone-200 ${cellBg}`}>
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-bold text-stone-800">{avg.toFixed(1)}%</span>
                              <span className="text-xs font-medium text-stone-600">{letterGrade}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Header({ backHref }: { backHref: string }) {
  return (
    <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <StarIcon size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">نظرة شاملة — جميع الدورات</h1>
              <p className="text-white/70 text-sm">الدرجات النهائية لجميع الطلاب في جميع الدورات</p>
            </div>
          </div>
          <Link
            href={backHref}
            className="px-5 py-2.5 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition"
          >
            العودة ←
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 px-4 py-3 min-w-[120px]">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-lg font-bold text-stone-800">{String(value)}</div>
    </div>
  );
}
