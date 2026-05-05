/**
 * Progress-specific types and DTOs
 */

/**
 * DTO for completing a lesson
 */
export interface CompleteLessonDTO {
  lessonId: string;
}

/**
 * Lesson progress with relations
 */
export interface LessonProgressWithRelations {
  id: string;
  userId: string;
  lessonId: string;
  completedAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  lesson?: {
    id: string;
    title: string;
    moduleId: string;
  };
}

/**
 * Lesson status response
 */
export interface LessonStatusResponse {
  completed: boolean;
  completedAt: Date | null;
}

/**
 * Course progress response
 */
export interface CourseProgressResponse {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  progress: Record<string, {
    lessonId: string;
    completedAt: Date;
  }>;
  completedLessonIds: string[];
}
