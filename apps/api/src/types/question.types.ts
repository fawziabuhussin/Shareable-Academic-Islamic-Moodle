/**
 * Question types for lesson questions - سؤال متعلق بالدرس
 */

/**
 * Question status enum values
 */
export type QuestionStatus = 
  | 'PENDING'    // في الانتظار
  | 'ANSWERED';  // تم الإجابة

/**
 * Data required to create a new question
 */
export interface CreateQuestionDTO {
  courseId: string;
  lessonId: string;
  question: string;
}

/**
 * Data for answering a question
 */
export interface AnswerQuestionDTO {
  answer: string;
}

/**
 * Question with all relations
 */
export interface QuestionWithRelations {
  id: string;
  question: string;
  answer: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  answeredAt: Date | null;
  student: {
    id: string;
    name: string;
    email: string;
  };
  course: {
    id: string;
    title: string;
    teacherId: string;
  };
  lesson: {
    id: string;
    title: string;
    order: number;
    module: {
      id: string;
      title: string;
      order: number;
    };
  };
  answeredBy?: {
    id: string;
    name: string;
  } | null;
}

/**
 * Filters for listing questions
 */
export interface QuestionFilters {
  status?: string;
  courseId?: string;
  lessonId?: string;
}
