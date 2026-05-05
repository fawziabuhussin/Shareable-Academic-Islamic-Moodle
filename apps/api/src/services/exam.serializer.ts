/**
 * Exam Serializer Service
 * Handles serialization of exam data based on user role and context
 * 
 * Security Rules for Answer Visibility:
 * - Teachers/Admins: Always see correct answers
 * - Students: Only see answers if ALL conditions are met:
 *   1. Current time is AFTER exam endDate
 *   2. Student has submitted the exam (has an attempt)
 *   3. Student PASSED (score >= passingScore)
 */
import { AuthContext } from '../types/common.types';
import {
  ExamQuestionWithParsedChoices,
  ExamQuestionForStudent,
  ExamQuestionWithAnswers,
  ExamWithRelations,
  QuestionType,
} from '../types/exam.types';

export class ExamSerializer {
  /**
   * Determine if answers should be revealed based on context
   *
   * @param auth - Authentication context (userId and role)
   * @param exam - Exam with relations (including attempts)
   * @returns boolean - true if answers should be revealed
   */
  shouldRevealAnswers(auth: AuthContext, exam: ExamWithRelations): boolean {
    // Teachers and admins always see answers
    if (auth.role === 'TEACHER' || auth.role === 'ADMIN') {
      return true;
    }

    // For students, check all conditions:
    const now = new Date();
    const endDate = new Date(exam.endDate);

    // Condition 1: Must be after endDate
    if (now <= endDate) {
      return false;
    }

    // Condition 2: Must have an attempt (latest attempt = first in array, ordered by attemptNumber desc)
    const studentAttempt = exam.attempts?.find((a) => a.userId === auth.userId);
    if (!studentAttempt) {
      return false;
    }

    // Condition 3: Must have passed (score >= passingScore)
    // For retake attempts, apply the exam-level penalty before checking
    const retakeMultiplier = (exam.retakeScorePercent ?? 75) / 100;
    const effectiveScore = studentAttempt.score !== null && studentAttempt.isRetake
      ? studentAttempt.score * retakeMultiplier
      : studentAttempt.score;
    if (effectiveScore === null || effectiveScore < exam.passingScore) {
      return false;
    }

    // All conditions met - reveal answers
    return true;
  }

  /**
   * Serialize question for student view (no answers)
   *
   * @param question - Question with parsed choices
   * @returns Question without correctIndex and explanation
   */
  toStudentView(question: ExamQuestionWithParsedChoices): ExamQuestionForStudent {
    return {
      id: question.id,
      prompt: question.prompt,
      type: question.type as QuestionType,
      choices: question.choices,
      images: question.images,
      points: question.points,
      order: question.order,
    };
  }

  /**
   * Serialize question with answers (teacher view or passed student after deadline)
   *
   * @param question - Question with parsed choices
   * @returns Question with correctIndex and explanation
   */
  toTeacherView(question: ExamQuestionWithParsedChoices): ExamQuestionWithAnswers {
    return {
      id: question.id,
      prompt: question.prompt,
      type: question.type as QuestionType,
      choices: question.choices,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
      images: question.images,
      points: question.points,
      order: question.order,
    };
  }

  /**
   * Serialize exam with appropriate question view based on user context
   *
   * @param exam - Exam with relations
   * @param auth - Authentication context
   * @returns Exam with questions serialized appropriately
   */
  serializeExam<T extends ExamWithRelations>(exam: T, auth: AuthContext): T {
    const revealAnswers = this.shouldRevealAnswers(auth, exam);

    return {
      ...exam,
      questions: exam.questions?.map((q) =>
        revealAnswers ? this.toTeacherView(q) : this.toStudentView(q)
      ),
    };
  }

  /**
   * Serialize multiple exams
   *
   * @param exams - Array of exams with relations
   * @param auth - Authentication context
   * @returns Array of serialized exams
   */
  serializeExams<T extends ExamWithRelations>(exams: T[], auth: AuthContext): T[] {
    return exams.map((exam) => this.serializeExam(exam, auth));
  }
}

/**
 * Singleton instance
 */
export const examSerializer = new ExamSerializer();
