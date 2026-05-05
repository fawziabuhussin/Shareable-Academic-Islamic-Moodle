/**
 * Question validation schemas
 */
import { z } from 'zod';

/**
 * Schema for creating a new question
 */
export const createQuestionSchema = z.object({
  courseId: z.string().uuid('معرف الدورة غير صالح'),
  lessonId: z.string().uuid('معرف الدرس غير صالح'),
  question: z
    .string()
    .min(1, 'يرجى إدخال السؤال'),
});

/**
 * Schema for answering a question
 */
export const answerQuestionSchema = z.object({
  answer: z
    .string()
    .min(1, 'يرجى إدخال الإجابة'),
});

/**
 * Schema for question filters
 */
export const questionFiltersSchema = z.object({
  status: z.enum(['PENDING', 'ANSWERED']).optional(),
  courseId: z.string().uuid().optional(),
  lessonId: z.string().uuid().optional(),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type AnswerQuestionInput = z.infer<typeof answerQuestionSchema>;
export type QuestionFiltersInput = z.infer<typeof questionFiltersSchema>;
