/**
 * Quiz-specific types and DTOs
 */

/**
 * DTO for submitting a quiz attempt
 */
export interface SubmitQuizAttemptDTO {
  answers: QuizAnswer[];
}

/**
 * Single answer in a quiz attempt
 */
export interface QuizAnswer {
  questionId: string;
  selectedIndex: number;
}

/**
 * Quiz with relations (includes questions)
 */
export interface QuizWithRelations {
  id: string;
  courseId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  questions: QuestionWithDetails[];
  course?: {
    id: string;
    title: string;
  };
}

/**
 * Question with full details
 */
export interface QuestionWithDetails {
  id: string;
  quizId: string;
  prompt: string;
  choices: string; // JSON string
  correctIndex: number;
  order: number;
  createdAt: Date;
}

/**
 * Quiz attempt result
 */
export interface QuizAttemptResult {
  id: string;
  userId: string;
  quizId: string;
  score: number;
  submittedAt: Date;
  correct: number;
  total: number;
}
