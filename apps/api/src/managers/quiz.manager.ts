/**
 * Quiz Manager
 * Business logic layer for quiz management
 */
import { quizRepository } from '../repositories/quiz.repository';
import { authorizationService } from '../services/authorization.service';
import { AuthContext } from '../types/common.types';
import { QuizWithRelations, SubmitQuizAttemptDTO, QuizAttemptResult } from '../types/quiz.types';

/**
 * Result types for manager operations
 */
export interface QuizListResult {
  success: boolean;
  data?: QuizWithRelations[];
  error?: { status: number; message: string };
}

export interface QuizAttemptSubmitResult {
  success: boolean;
  data?: QuizAttemptResult;
  error?: { status: number; message: string };
}

export class QuizManager {
  /**
   * List all quizzes for a course
   */
  async listQuizzes(auth: AuthContext, courseId: string): Promise<QuizListResult> {
    // Check authorization - admins, teachers, and enrolled students can view quizzes
    const access = await authorizationService.checkReadAccess(auth, { type: 'course', id: courseId });
    
    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول' },
      };
    }

    const quizzes = await quizRepository.findByCourseId(courseId);
    return { success: true, data: quizzes };
  }

  /**
   * Submit a quiz attempt
   */
  async submitQuizAttempt(
    auth: AuthContext,
    quizId: string,
    attemptData: SubmitQuizAttemptDTO
  ): Promise<QuizAttemptSubmitResult> {
    // Fetch quiz with enrollment information
    const quiz = await quizRepository.findByIdWithEnrollment(quizId, auth.userId);

    if (!quiz) {
      return {
        success: false,
        error: { status: 404, message: 'Quiz not found' },
      };
    }

    // Check enrollment - admins can always submit, students must be enrolled
    if (auth.role !== 'ADMIN' && quiz.course.enrollments.length === 0) {
      return {
        success: false,
        error: { status: 403, message: 'يجب أن تكون مسجلاً في هذه الدورة' },
      };
    }

    // Calculate score
    let correct = 0;
    quiz.questions.forEach((question) => {
      const answer = attemptData.answers.find((a) => a.questionId === question.id);
      if (answer && answer.selectedIndex === question.correctIndex) {
        correct++;
      }
    });

    const score = quiz.questions.length > 0 ? (correct / quiz.questions.length) * 100 : 0;

    // Create attempt
    const attempt = await quizRepository.createAttempt(auth.userId, quizId, score);

    // Return result with additional details
    const result: QuizAttemptResult = {
      ...attempt,
      correct,
      total: quiz.questions.length,
    };

    return { success: true, data: result };
  }
}

/**
 * Singleton instance
 */
export const quizManager = new QuizManager();
