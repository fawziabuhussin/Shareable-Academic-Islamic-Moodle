/**
 * Validation schemas for Quiz
 */
import { z } from 'zod';

/**
 * Schema for a single quiz answer
 */
const quizAnswerSchema = z.object({
  questionId: z.string().uuid('معرف السؤال غير صالح'),
  selectedIndex: z.number().int().min(0, 'الإجابة المختارة غير صالحة'),
});

/**
 * Schema for submitting a quiz attempt
 */
export const submitQuizAttemptSchema = z.object({
  answers: z.array(quizAnswerSchema).min(1, 'يجب تقديم إجابة واحدة على الأقل'),
});

/**
 * Schema for creating a new quiz
 */
export const createQuizSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1, 'العنوان مطلوب').max(200, 'العنوان طويل جداً'),
  weightPercent: z.number().min(0).max(100).default(0),
});

/**
 * Schema for updating an existing quiz
 */
export const updateQuizSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  weightPercent: z.number().min(0).max(100).optional(),
});

/**
 * Type inference from schemas
 */
export type SubmitQuizAttemptInput = z.infer<typeof submitQuizAttemptSchema>;
export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
