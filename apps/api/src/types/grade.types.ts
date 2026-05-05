/**
 * Grade-specific types and DTOs (new grading system)
 */

export interface AssessmentScore {
  id: string;
  type: 'EXAM' | 'HOMEWORK' | 'QUIZ';
  title: string;
  score: number | null;
  effectiveScore?: number | null;
  maxScore: number;
  weightPercent: number;
  isRetake?: boolean;
}

export interface StudentCourseBreakdown {
  courseId: string;
  courseTitle: string;
  readingWeight: number;
  lessonCompletionPercent: number;
  assessments: AssessmentScore[];
  projectedGrade?: { percentage: number; weightCovered: number };
  finalGrade?: {
    finalScore: number;
    overrideScore: number | null;
    effectiveScore: number;
    letterGrade: string;
    finalizedAt: Date;
  };
}

export interface StudentGradeRow {
  userId: string;
  studentName: string;
  studentEmail: string;
  enrollmentId: string;
  assessments: AssessmentScore[];
  lessonCompletionPercent: number;
  projectedGrade: { percentage: number; weightCovered: number };
  finalScore: number | null;
  overrideScore: number | null;
  effectiveScore: number | null;
  letterGrade: string | null;
  finalizedAt: Date | null;
}

export interface StudentGradesSummary {
  courses: Array<{
    courseId: string;
    courseTitle: string;
    coverImage: string | null;
    finalScore: number | null;
    overrideScore: number | null;
    effectiveScore: number | null;
    letterGrade: string | null;
    isFinalized: boolean;
    assessments: AssessmentScore[];
    readingWeight: number;
    lessonCompletionPercent: number;
  }>;
  average: number;
  averageFormatted: string;
  finalizedCourseCount: number;
}

export interface CourseWeightSummary {
  readingWeight: number;
  assessments: Array<{
    id: string;
    type: 'EXAM' | 'HOMEWORK' | 'QUIZ';
    title: string;
    weightPercent: number;
  }>;
  total: number;
  isValid: boolean;
  remaining: number;
}

// ── Cross-course grades overview ─────────────────────────────────────────────

export interface CrossCourseGradeEntry {
  effectiveScore: number | null;
  letterGrade: string | null;
  isFinalized: boolean;
}

export interface CrossCourseGradeRow {
  userId: string;
  studentName: string;
  studentEmail: string;
  courseGrades: Record<string, CrossCourseGradeEntry>; // keyed by courseId
}

export interface CrossCourseGradesResponse {
  courses: Array<{ id: string; title: string }>;
  students: CrossCourseGradeRow[];
}
