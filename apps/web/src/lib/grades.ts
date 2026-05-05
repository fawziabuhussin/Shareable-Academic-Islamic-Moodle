/**
 * Centralized letter-grade helpers.
 *
 * Every component that needs to display or derive a letter grade should import
 * from here so colours / thresholds stay consistent across the whole portal.
 */

// ── Letter-grade badge colour (text + bg) ────────────────────────────────────

export const getLetterGradeColor = (grade: string | null): string => {
  if (!grade) return '';
  switch (grade) {
    case 'ممتاز':        return 'text-emerald-600 bg-emerald-50';
    case 'جيد جدا':      return 'text-sky-700 bg-sky-100';
    case 'جيد':          return 'text-sky-600 bg-sky-50';
    case 'مقبول':        return 'text-orange-600 bg-orange-50';
    case 'راسب':         return 'text-red-600 bg-red-50';
    default:             return '';
  }
};

// ── Grade cell background (used for full-row tinting) ────────────────────────

export const getGradeCellBg = (grade: string | null): string => {
  if (!grade) return '';
  switch (grade) {
    case 'ممتاز':        return 'bg-emerald-50';
    case 'جيد جدا':      return 'bg-sky-100';
    case 'جيد':          return 'bg-sky-50';
    case 'مقبول':        return 'bg-orange-50';
    case 'راسب':         return 'bg-red-50';
    default:             return '';
  }
};

// ── Percentage → letter grade ────────────────────────────────────────────────

export const getLetterGrade = (percentage: number): string => {
  if (percentage >= 90) return 'ممتاز';
  if (percentage >= 80) return 'جيد جدا';
  if (percentage >= 70) return 'جيد';
  if (percentage >= 60) return 'مقبول';
  return 'راسب';
};

// ── Failing grade constant (for pass/fail checks) ────────────────────────────

export const FAILING_GRADE = 'راسب';
