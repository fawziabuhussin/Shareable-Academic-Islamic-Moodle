/**
 * Exam-specific types and DTOs
 */

/**
 * DTO for creating a new exam
 */
export interface CreateExamDTO {
  title: string;
  description?: string;
  durationMinutes: number;
  startDate: Date;
  endDate: Date;
  maxScore: number;
  passingScore: number;
  maxAttempts?: number;
  retakeScorePercent?: number;
  weightPercent?: number;
}

/**
 * DTO for updating an existing exam
 */
export interface UpdateExamDTO {
  title?: string;
  description?: string | null;
  durationMinutes?: number;
  startDate?: Date;
  endDate?: Date;
  maxScore?: number;
  passingScore?: number;
  maxAttempts?: number;
  retakeScorePercent?: number;
  weightPercent?: number;
}

/**
 * DTO for creating a new exam question
 */
export interface CreateExamQuestionDTO {
  prompt: string;
  type: 'MULTIPLE_CHOICE' | 'TEXT' | 'ESSAY';
  choices?: string[];
  correctIndex?: number;
  explanation?: string;
  images?: { imageUrl: string; order?: number }[];
  points: number;
  order?: number;
}

/**
 * DTO for updating an existing exam question
 */
export interface UpdateExamQuestionDTO {
  prompt?: string;
  type?: 'MULTIPLE_CHOICE' | 'TEXT' | 'ESSAY';
  choices?: string[];
  correctIndex?: number;
  explanation?: string | null;
  images?: { imageUrl: string; order?: number }[];
  points?: number;
  order?: number;
}

/**
 * DTO for submitting an exam attempt
 */
export interface SubmitExamAttemptDTO {
  answers: Record<string, number | string>; // questionId -> answer (index or text)
}

/**
 * DTO for grading an exam attempt
 */
export interface GradeExamAttemptDTO {
  questionScores?: Record<string, number>; // questionId -> score
  finalScore?: number;
  bonus?: number;
}

/**
 * DTO for updating exam attempt score
 */
export interface UpdateExamAttemptScoreDTO {
  bonus?: number;
  finalScore?: number;
}

/**
 * Image attached to an exam question
 */
export interface ExamQuestionImageData {
  id: string;
  imageUrl: string;
  order: number;
}

/**
 * Exam question with parsed choices (internal use - includes answers)
 */
export interface ExamQuestionWithParsedChoices {
  id: string;
  prompt: string;
  type: string;
  choices: string[];
  correctIndex: number | null;
  explanation: string | null;
  images: ExamQuestionImageData[];
  points: number;
  order: number;
}

/**
 * Question type enum for type safety
 */
export type QuestionType = 'MULTIPLE_CHOICE' | 'TEXT' | 'ESSAY';

/**
 * Base question fields (shared between student and teacher views)
 */
export interface ExamQuestionBase {
  id: string;
  prompt: string;
  type: QuestionType;
  choices: string[];
  images: ExamQuestionImageData[];
  points: number;
  order: number;
}

/**
 * Question view for students (no answers revealed)
 */
export interface ExamQuestionForStudent extends ExamQuestionBase {
  // Intentionally excludes correctIndex and explanation
}

/**
 * Question view with answers (for teachers or passed students after endDate)
 */
export interface ExamQuestionWithAnswers extends ExamQuestionBase {
  correctIndex: number | null;
  explanation: string | null;
}

/**
 * Union type for serialized question responses
 */
export type ExamQuestionResponse = ExamQuestionForStudent | ExamQuestionWithAnswers;

/**
 * Exam with relations (includes related data)
 */
export interface ExamWithRelations {
  id: string;
  courseId: string;
  title: string;
  description: string;
  durationMinutes: number;
  startDate: Date;
  endDate: Date;
  maxScore: number;
  passingScore: number;
  maxAttempts: number;
  retakeScorePercent: number;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  course?: {
    id: string;
    title: string;
    description?: string | null;
    teacherId?: string;
    enrollments?: Array<{
      userId: string;
      status: string;
    }>;
    modules?: Array<{
      id: string;
      lessons: Array<{
        id: string;
      }>;
    }>;
    teacher?: {
      id: string;
      name: string;
    };
  };
  questions?: ExamQuestionWithParsedChoices[];
  attempts?: Array<{
    id: string;
    userId: string;
    attemptNumber: number;
    isRetake: boolean;
    score: number | null;
    status: string;
    submittedAt: Date;
  }>;
  _count?: {
    attempts: number;
  };
}

/**
 * Exam attempt with relations
 */
export interface ExamAttemptWithRelations {
  id: string;
  examId: string;
  userId: string;
  attemptNumber: number;
  isRetake: boolean;
  answers: string;
  score: number | null;
  status: string;
  submittedAt: Date;
  startedAt: Date;
  // Relations
  user?: {
    id: string;
    name: string;
    email: string;
  };
  exam?: {
    id: string;
    courseId: string;
    maxScore: number;
    questions?: ExamQuestionWithParsedChoices[];
  };
}

/**
 * Exam attempt result with grading information
 */
export interface ExamAttemptResult {
  attempt: ExamAttemptWithRelations;
  score: number | null;
  effectiveScore?: number | null; // After retake penalty (score * retakeScorePercent/100)
  percentage?: number;
  letterGrade?: string;
  status: string;
  isRetake?: boolean;
  message?: string;
}

/**
 * Retake eligibility info included in exam responses
 */
export interface RetakeInfo {
  canRetake: boolean;
  previousAttemptFailed: boolean;
  previousScore: number | null;
  maxEffectiveScore: number;       // maxScore * (retakeScorePercent / 100)
  attemptNumber: number;           // Current attempt count (0 = no attempts yet)
  retakeScorePercent?: number;     // Percentage applied to retake scores (e.g., 75)
}

/**
 * Course completion status
 */
export interface CourseCompletionStatus {
  allLessonsCompleted: boolean;
  completedLessons: number;
  totalLessons: number;
}
