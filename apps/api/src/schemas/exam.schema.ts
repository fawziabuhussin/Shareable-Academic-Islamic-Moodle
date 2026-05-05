/**
 * Validation schemas for Exam
 */
import { z } from 'zod';

/**
 * Schema for creating a new exam
 */
export const createExamSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1, 'العنوان مطلوب').max(200, 'العنوان طويل جداً'),
  description: z.string().optional(),
  durationMinutes: z.number().int().min(1, 'مدة الامتحان يجب أن تكون أكثر من 0 دقيقة'),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  maxScore: z.number().default(100),
  passingScore: z.number().default(60),
  maxAttempts: z.number().int().min(0, 'عدد المحاولات لا يمكن أن يكون سالبًا').default(2),
  retakeScorePercent: z.number().min(1, 'النسبة يجب أن تكون 1% على الأقل').max(100, 'النسبة لا يمكن أن تتجاوز 100%').default(75),
  weightPercent: z.number().min(0).max(100).default(0),
}).refine((data) => {
  return data.startDate.getTime() >= Date.now() - 60000; // Allow 1 minute tolerance
}, {
  message: 'تاريخ ووقت البدء لا يمكن أن يكون في الماضي',
  path: ['startDate'],
}).refine((data) => {
  return data.endDate.getTime() > data.startDate.getTime();
}, {
  message: 'تاريخ ووقت الانتهاء يجب أن يكون بعد تاريخ ووقت البدء',
  path: ['endDate'],
});

/**
 * Schema for updating an existing exam
 */
export const updateExamSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  durationMinutes: z.number().int().min(1).optional(),
  startDate: z.string().transform(str => new Date(str)).optional(),
  endDate: z.string().transform(str => new Date(str)).optional(),
  maxScore: z.number().optional(),
  passingScore: z.number().optional(),
  maxAttempts: z.number().int().min(0).optional(),
  retakeScorePercent: z.number().min(1).max(100).optional(),
  weightPercent: z.number().min(0).max(100).optional(),
});

/**
 * Schema for creating a new exam question
 */
export const createExamQuestionSchema = z.object({
  examId: z.string().uuid(),
  prompt: z.string().min(1, 'السؤال مطلوب'),
  type: z.enum(['MULTIPLE_CHOICE', 'TEXT', 'ESSAY']).default('MULTIPLE_CHOICE'),
  choices: z.array(z.string()).min(2, 'يجب أن يكون هناك خياران على الأقل').optional(),
  correctIndex: z.number().int().min(0).optional(),
  explanation: z.string().optional(),
  images: z.array(z.object({
    imageUrl: z.string().url('رابط الصورة غير صالح'),
    order: z.number().int().min(0).optional(),
  })).optional(),
  points: z.number().default(1),
  order: z.number().int().optional(),
}).refine((data) => {
  if (data.type === 'MULTIPLE_CHOICE') {
    return data.choices && data.choices.length >= 2 && data.correctIndex !== undefined;
  }
  return true;
}, {
  message: 'الأسئلة متعددة الخيارات تتطلب خيارات والإجابة الصحيحة',
});

/**
 * Schema for updating an existing exam question
 */
export const updateExamQuestionSchema = z.object({
  prompt: z.string().min(1).optional(),
  type: z.enum(['MULTIPLE_CHOICE', 'TEXT', 'ESSAY']).optional(),
  choices: z.array(z.string()).min(2).optional(),
  correctIndex: z.number().int().min(0).optional(),
  explanation: z.string().optional(),
  images: z.array(z.object({
    imageUrl: z.string().url('رابط الصورة غير صالح'),
    order: z.number().int().min(0).optional(),
  })).optional(),
  points: z.number().optional(),
  order: z.number().int().optional(),
}).refine((data) => {
  if (data.type === 'MULTIPLE_CHOICE') {
    return !data.choices || (data.choices.length >= 2 && data.correctIndex !== undefined);
  }
  return true;
}, {
  message: 'الأسئلة متعددة الخيارات تتطلب خيارات والإجابة الصحيحة',
});

/**
 * Schema for submitting an exam attempt
 */
export const submitExamAttemptSchema = z.object({
  answers: z.record(z.union([z.number(), z.string()])),
});

/**
 * Schema for grading an exam attempt
 */
export const gradeExamAttemptSchema = z.object({
  questionScores: z.record(z.number()).optional(),
  finalScore: z.number().optional(),
  bonus: z.number().optional(),
}).refine((data) => {
  return data.questionScores !== undefined || data.finalScore !== undefined;
}, {
  message: 'Either questionScores or finalScore must be provided',
});

/**
 * Schema for updating exam attempt score with bonus
 */
export const updateExamAttemptScoreSchema = z.object({
  bonus: z.number().optional(),
  finalScore: z.number().optional(),
});

/**
 * Schema for a Google Forms JSON question choice
 */
const googleFormChoiceSchema = z.object({
  text: z.string(),
  isCorrect: z.boolean().optional().default(false),
});

/**
 * Schema for a Google Forms JSON question.
 * Accepts all item types from the export (IMAGE, PAGE_BREAK, SECTION_HEADER, etc.)
 * — non-question items are filtered out later in the manager.
 */
const googleFormQuestionSchema = z.object({
  title: z.string().optional().default(''),
  type: z.string(),
  id: z.union([z.string(), z.number()]).optional(),
  points: z.number().optional().default(1),
  choices: z.array(googleFormChoiceSchema).optional().default([]),
});

/**
 * Schema for the Google Forms exported JSON
 */
export const googleFormJsonSchema = z.object({
  formTitle: z.string().optional(),
  description: z.string().optional(),
  isQuiz: z.boolean().optional(),
  questions: z.array(googleFormQuestionSchema).min(1, 'يجب أن يحتوي الملف على سؤال واحد على الأقل'),
});

/**
 * Schema for importing an exam from a Google Forms JSON URL
 */
export const importExamFromJsonSchema = z.object({
  courseId: z.string().uuid(),
  jsonUrl: z.string().url('رابط JSON غير صالح'),
  title: z.string().min(1, 'العنوان مطلوب').max(200, 'العنوان طويل جداً').optional(),
  description: z.string().optional(),
  durationMinutes: z.number().int().min(1, 'مدة الامتحان يجب أن تكون أكثر من 0 دقيقة'),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  maxScore: z.number().default(100),
  passingScore: z.number().default(60),
  maxAttempts: z.number().int().min(0).default(2),
  retakeScorePercent: z.number().min(1).max(100).default(75),
  weightPercent: z.number().min(0).max(100).default(0),
}).refine((data) => {
  return data.startDate.getTime() >= Date.now() - 60000;
}, {
  message: 'تاريخ ووقت البدء لا يمكن أن يكون في الماضي',
  path: ['startDate'],
}).refine((data) => {
  return data.endDate.getTime() > data.startDate.getTime();
}, {
  message: 'تاريخ ووقت الانتهاء يجب أن يكون بعد تاريخ ووقت البدء',
  path: ['endDate'],
});

/**
 * Type inference from schemas
 */
export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
export type CreateExamQuestionInput = z.infer<typeof createExamQuestionSchema>;
export type UpdateExamQuestionInput = z.infer<typeof updateExamQuestionSchema>;
export type SubmitExamAttemptInput = z.infer<typeof submitExamAttemptSchema>;
export type GradeExamAttemptInput = z.infer<typeof gradeExamAttemptSchema>;
export type UpdateExamAttemptScoreInput = z.infer<typeof updateExamAttemptScoreSchema>;
