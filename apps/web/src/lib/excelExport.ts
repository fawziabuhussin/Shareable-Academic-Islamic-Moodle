/**
 * Excel export utilities for grade views.
 *
 * Uses ExcelJS for rich formatting (RTL, colours, freeze panes) and
 * file-saver to trigger the browser download.
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getLetterGrade } from '@/lib/grades';

// Re-import types used by CourseGradesView
import type { CourseGradesResponse } from '@/components/CourseGradesView';

// ── Colour helpers ───────────────────────────────────────────────────────────

/** Map Arabic letter grade → ARGB fill colour (without leading #). */
const gradeToFill = (grade: string | null): string | null => {
  if (!grade) return null;
  switch (grade) {
    case 'ممتاز':   return 'FFD1FAE5'; // emerald-100
    case 'جيد جدا': return 'FFBAE6FD'; // sky-200
    case 'جيد':     return 'FFE0F2FE'; // sky-100
    case 'مقبول':   return 'FFFED7AA'; // orange-200
    case 'راسب':    return 'FFFECACA'; // red-200
    default:        return null;
  }
};

const HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1A3A2F' }, // brand green
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 12,
};

const FOOTER_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF5F5F4' }, // stone-100
};

const applyGradeFill = (cell: ExcelJS.Cell, grade: string | null) => {
  const argb = gradeToFill(grade);
  if (argb) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
  }
};

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFD6D3D1' } },
  bottom: { style: 'thin', color: { argb: 'FFD6D3D1' } },
  left: { style: 'thin', color: { argb: 'FFD6D3D1' } },
  right: { style: 'thin', color: { argb: 'FFD6D3D1' } },
};

// ── ISO date string for file names ───────────────────────────────────────────

const isoDate = () => new Date().toISOString().slice(0, 10);

// ── Save workbook helper ─────────────────────────────────────────────────────

async function saveWorkbook(wb: ExcelJS.Workbook, fileName: string) {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, fileName);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Course Grades Export (single course)
// ═══════════════════════════════════════════════════════════════════════════════

export async function exportCourseGrades(
  courseTitle: string,
  data: CourseGradesResponse,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'زاد الهداية';
  wb.created = new Date();

  const ws = wb.addWorksheet(courseTitle || 'الدرجات', {
    views: [{ rightToLeft: true, state: 'frozen', xSplit: 1, ySplit: 1 }],
  });

  // ── Build header row ────────────────────────────────────────────────────
  const headers: string[] = [
    'اسم الطالب',
    'البريد الإلكتروني',
  ];

  // One column per assessment
  const assessmentMeta = data.weightSummary.assessments;
  for (const a of assessmentMeta) {
    const typeLabel = a.type === 'EXAM' ? 'اختبار' : a.type === 'HOMEWORK' ? 'واجب' : 'اختبار قصير';
    headers.push(`${a.title} (${typeLabel} ${a.weightPercent}%)`);
  }

  headers.push(
    `القراءة (${data.weightSummary.readingWeight}%)`,
    'العلامة المتوقعة',
    'الدرجة النهائية',
    'التقدير',
  );

  const headerRow = ws.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });
  headerRow.height = 30;

  // ── Data rows ───────────────────────────────────────────────────────────
  for (const student of data.students) {
    const row: (string | number | null)[] = [
      student.studentName,
      student.studentEmail,
    ];

    // Assessment scores
    for (const meta of assessmentMeta) {
      const sa = student.assessments.find((a) => a.id === meta.id);
      if (!sa || sa.score === null) {
        row.push('—');
      } else {
        const label = `${sa.score}/${sa.maxScore}`;
        row.push(sa.isRetake ? `${label} (إعادة)` : label);
      }
    }

    // Reading %
    row.push(Math.round(student.lessonCompletionPercent));

    // Projected grade
    row.push(
      student.projectedGrade.weightCovered > 0
        ? Number(student.projectedGrade.percentage.toFixed(1))
        : null,
    );

    // Final / effective score
    row.push(
      student.effectiveScore !== null
        ? Number(student.effectiveScore.toFixed(1))
        : null,
    );

    // Letter grade
    row.push(student.letterGrade ?? null);

    const dataRow = ws.addRow(row);

    // Apply grade-based fill to the letter-grade cell (last column)
    const gradeCell = dataRow.getCell(headers.length);
    applyGradeFill(gradeCell, student.letterGrade);

    // Also tint the final score cell
    const finalCell = dataRow.getCell(headers.length - 1);
    applyGradeFill(finalCell, student.letterGrade);

    // Style all cells
    dataRow.eachCell((cell) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
    });
    // Name cell left-aligned
    dataRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    dataRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
  }

  // ── Column widths ──────────────────────────────────────────────────────
  ws.getColumn(1).width = 28; // student name
  ws.getColumn(2).width = 30; // email
  for (let i = 3; i <= 2 + assessmentMeta.length; i++) {
    ws.getColumn(i).width = 22;
  }
  const baseCol = 3 + assessmentMeta.length;
  ws.getColumn(baseCol).width = 14;     // reading
  ws.getColumn(baseCol + 1).width = 16; // projected
  ws.getColumn(baseCol + 2).width = 16; // final
  ws.getColumn(baseCol + 3).width = 14; // letter grade

  // ── Save ────────────────────────────────────────────────────────────────
  const safeName = courseTitle.replace(/[\\/:*?"<>|]/g, '_');
  await saveWorkbook(wb, `درجات_${safeName}_${isoDate()}.xlsx`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. All Courses Grades Export (cross-course matrix)
// ═══════════════════════════════════════════════════════════════════════════════

interface CrossCourseExportData {
  courses: Array<{ id: string; title: string }>;
  students: Array<{
    userId: string;
    studentName: string;
    studentEmail: string;
    courseGrades: Record<
      string,
      { effectiveScore: number | null; letterGrade: string | null; isFinalized: boolean }
    >;
  }>;
}

export async function exportAllCoursesGrades(
  data: CrossCourseExportData,
  selectedCourseIds: Set<string>,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'زاد الهداية';
  wb.created = new Date();

  const visibleCourses = data.courses.filter((c) => selectedCourseIds.has(c.id));

  const ws = wb.addWorksheet('جميع الدورات', {
    views: [{ rightToLeft: true, state: 'frozen', xSplit: 1, ySplit: 1 }],
  });

  // ── Header row ──────────────────────────────────────────────────────────
  const headers = ['اسم الطالب', 'البريد الإلكتروني', ...visibleCourses.map((c) => c.title)];

  const headerRow = ws.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });
  headerRow.height = 30;

  // ── Data rows ───────────────────────────────────────────────────────────
  for (const student of data.students) {
    const row: (string | number | null)[] = [student.studentName, student.studentEmail];

    for (const course of visibleCourses) {
      const entry = student.courseGrades[course.id];
      if (!entry) {
        row.push('—');
      } else if (entry.effectiveScore === null) {
        row.push('غير معتمد');
      } else {
        row.push(Number(entry.effectiveScore.toFixed(1)));
      }
    }

    const dataRow = ws.addRow(row);

    // Tint grade cells
    for (let i = 0; i < visibleCourses.length; i++) {
      const entry = student.courseGrades[visibleCourses[i].id];
      if (entry?.effectiveScore !== null && entry?.effectiveScore !== undefined) {
        const grade = entry.letterGrade ?? getLetterGrade(entry.effectiveScore);
        applyGradeFill(dataRow.getCell(3 + i), grade);
      }
    }

    dataRow.eachCell((cell) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
    });
    dataRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    dataRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
  }

  // ── Footer: averages row ────────────────────────────────────────────────
  const footerValues: (string | number)[] = ['المعدل العام', ''];
  for (const course of visibleCourses) {
    const scores = data.students
      .map((s) => s.courseGrades[course.id]?.effectiveScore)
      .filter((s): s is number => s !== null && s !== undefined);
    if (scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      footerValues.push(Number(avg.toFixed(1)));
    } else {
      footerValues.push('—');
    }
  }

  const footerRow = ws.addRow(footerValues);
  footerRow.eachCell((cell) => {
    cell.fill = FOOTER_FILL;
    cell.font = { bold: true, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });
  footerRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

  // ── Column widths ──────────────────────────────────────────────────────
  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 30;
  for (let i = 3; i <= 2 + visibleCourses.length; i++) {
    ws.getColumn(i).width = 20;
  }

  // ── Save ────────────────────────────────────────────────────────────────
  await saveWorkbook(wb, `درجات_جميع_الدورات_${isoDate()}.xlsx`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Users List Export
// ═══════════════════════════════════════════════════════════════════════════════

export interface ExportableUser {
  name: string;
  role: string;
  email: string;
  gender?: string;
  blocked: boolean;
  profession?: string;
  location?: string;
  dateOfBirth?: string;
  createdAt: string;
  idNumber?: string;
  phone?: string;
  _count: { coursesTaught?: number; enrollments?: number };
}

export async function exportUsersToExcel(users: ExportableUser[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('المستخدمين', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
  });

  // ── Headers ────────────────────────────────────────────────────────────
  const headers = [
    'اسم المستخدم',
    'نوع المستخدم',
    'البريد الإلكتروني',
    'الفئة',
    'الحالة',
    'المهنة',
    'البلد',
    'تاريخ الولادة',
    'تاريخ التسجيل',
    'رقم الهوية',
    'رقم الهاتف',
    'عدد التسجيلات',
  ];

  const headerRow = ws.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });
  headerRow.height = 28;

  // ── Role label helper ──────────────────────────────────────────────────
  const roleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'مشرف';
      case 'TEACHER': return 'مدرس';
      case 'STUDENT': return 'طالب';
      default: return role;
    }
  };

  // ── Gender label helper ────────────────────────────────────────────────
  const genderLabel = (gender?: string) => {
    if (!gender) return '';
    return gender === 'MALE' ? 'أخوة' : 'أخوات';
  };

  // ── Data rows ──────────────────────────────────────────────────────────
  for (const user of users) {
    const createdDate = new Date(user.createdAt);
    const createdStr = createdDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const dobStr = user.dateOfBirth
      ? new Date(user.dateOfBirth).toLocaleDateString('en-CA')
      : '';

    const row = ws.addRow([
      user.name,
      roleLabel(user.role),
      user.email,
      genderLabel(user.gender),
      user.blocked ? 'محظور' : 'نشط',
      user.profession || '',
      user.location || '',
      dobStr,
      createdStr,
      user.idNumber || '',
      user.phone || '',
      user._count?.enrollments || 0,
    ]);

    row.eachCell((cell) => {
      cell.border = thinBorder;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    // Right-align name, profession, location
    row.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };

    // Colour the status cell
    const statusCell = row.getCell(5);
    if (user.blocked) {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } }; // red-200
    } else {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // emerald-100
    }
  }

  // ── Column widths ──────────────────────────────────────────────────────
  ws.getColumn(1).width = 28;  // name
  ws.getColumn(2).width = 14;  // role
  ws.getColumn(3).width = 32;  // email
  ws.getColumn(4).width = 14;  // gender
  ws.getColumn(5).width = 12;  // status
  ws.getColumn(6).width = 20;  // profession
  ws.getColumn(7).width = 18;  // location
  ws.getColumn(8).width = 16;  // date of birth
  ws.getColumn(9).width = 16;  // created date
  ws.getColumn(10).width = 16; // id number
  ws.getColumn(11).width = 16; // phone
  ws.getColumn(12).width = 16; // enrollments

  // ── Save ────────────────────────────────────────────────────────────────
  await saveWorkbook(wb, `المستخدمين_${isoDate()}.xlsx`);
}
