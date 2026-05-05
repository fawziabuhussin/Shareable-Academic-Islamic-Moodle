/**
 * Homework-specific types and DTOs
 */

/**
 * DTO for creating a new homework
 */
export interface CreateHomeworkDTO {
  title: string;
  description: string;
  dueDate: Date;
  maxScore: number;
  moduleId?: string | null;
  lessonId?: string | null;
  weightPercent?: number;
}

/**
 * DTO for updating an existing homework
 */
export interface UpdateHomeworkDTO {
  title?: string;
  description?: string;
  dueDate?: Date;
  maxScore?: number;
  moduleId?: string | null;
  lessonId?: string | null;
  weightPercent?: number;
}

/**
 * DTO for submitting homework
 */
export interface SubmitHomeworkDTO {
  content: string;
  attachments?: string;
}

/**
 * DTO for grading homework
 */
export interface GradeHomeworkDTO {
  score: number;
  feedback?: string;
}

/**
 * Homework with relations (includes related data)
 */
export interface HomeworkWithRelations {
  id: string;
  courseId: string;
  moduleId: string | null;
  lessonId: string | null;
  title: string;
  description: string;
  dueDate: Date;
  maxScore: number;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  course?: {
    id: string;
    title: string;
    description: string | null;
    teacherId: string;
    teacher?: {
      id: string;
      name: string;
    };
    enrollments?: Array<{
      userId: string;
      status: string;
    }>;
  };
  submissions?: Array<{
    id: string;
    userId: string;
    content: string;
    fileUrl: string | null;
    score: number | null;
    feedback: string | null;
    submittedAt: Date;
    gradedAt: Date | null;
    user?: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  _count?: {
    submissions: number;
  };
}

/**
 * Homework submission with relations
 */
export interface HomeworkSubmissionWithRelations {
  id: string;
  homeworkId: string;
  userId: string;
  content: string;
  fileUrl: string | null;
  score: number | null;
  feedback: string | null;
  submittedAt: Date;
  gradedAt: Date | null;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}
