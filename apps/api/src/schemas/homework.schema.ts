/**
 * Validation schemas for Homework
 */
import { z } from 'zod';

/**
 * Schema for creating a new homework
 */
export const createHomeworkSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب').max(200, 'العنوان طويل جداً'),
  description: z.string().min(1, 'الوصف مطلوب'),
  dueDate: z.union([
    z.string().transform(str => new Date(str)),
    z.date()
  ]),
  maxScore: z.number().min(1, 'الدرجة العظمى يجب أن تكون أكبر من 0').default(100),
  moduleId: z.string().uuid().optional().nullable(),
  lessonId: z.string().uuid().optional().nullable(),
  weightPercent: z.number().min(0).max(100).default(0),
});

/**
 * Schema for updating an existing homework
 */
export const updateHomeworkSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  dueDate: z.union([
    z.string().transform(str => new Date(str)),
    z.date()
  ]).optional(),
  maxScore: z.number().min(1).optional(),
  moduleId: z.string().uuid().optional().nullable(),
  lessonId: z.string().uuid().optional().nullable(),
  weightPercent: z.number().min(0).max(100).optional(),
});

/**
 * Schema for submitting homework
 */
export const submitHomeworkSchema = z.object({
  content: z.string().min(1, 'المحتوى مطلوب'),
  attachments: z.string().optional(),
});

/**
 * Schema for grading homework
 */
export const gradeHomeworkSchema = z.object({
  score: z.number().min(0, 'الدرجة يجب أن تكون أكبر من أو تساوي 0'),
  feedback: z.string().optional(),
});

/**
 * Type inference from schemas
 */
export type CreateHomeworkInput = z.infer<typeof createHomeworkSchema>;
export type UpdateHomeworkInput = z.infer<typeof updateHomeworkSchema>;
export type SubmitHomeworkInput = z.infer<typeof submitHomeworkSchema>;
export type GradeHomeworkInput = z.infer<typeof gradeHomeworkSchema>;
