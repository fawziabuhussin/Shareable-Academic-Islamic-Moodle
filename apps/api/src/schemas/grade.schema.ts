/**
 * Validation schemas for Grade
 */
import { z } from 'zod';

/**
 * Schema for validating userId parameter
 */
export const userIdParamSchema = z.object({
  userId: z.string().uuid('معرف المستخدم غير صالح'),
});

/**
 * Schema for validating courseId parameter
 */
export const courseIdParamSchema = z.object({
  courseId: z.string().uuid('معرف الدورة غير صالح'),
});

/**
 * Schema for validating course + student parameters
 */
export const courseStudentParamSchema = z.object({
  courseId: z.string().uuid('معرف الدورة غير صالح'),
  userId: z.string().uuid('معرف المستخدم غير صالح'),
});

/**
 * Schema for override grade body
 */
export const overrideGradeSchema = z.object({
  overrideScore: z.number().min(0, 'الدرجة يجب أن تكون أكبر من أو تساوي 0').max(100, 'الدرجة يجب أن تكون أقل من أو تساوي 100'),
});

/**
 * Schema for manual grade insertion (admin/teacher inserts grade for any student)
 */
export const manualGradeSchema = z.object({
  userId: z.string().uuid('معرف المستخدم غير صالح'),
  score: z.number().min(0, 'الدرجة يجب أن تكون أكبر من أو تساوي 0').max(100, 'الدرجة يجب أن تكون أقل من أو تساوي 100'),
});

/**
 * Type inference from schemas
 */
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type CourseIdParam = z.infer<typeof courseIdParamSchema>;
export type CourseStudentParam = z.infer<typeof courseStudentParamSchema>;
export type OverrideGradeInput = z.infer<typeof overrideGradeSchema>;
export type ManualGradeInput = z.infer<typeof manualGradeSchema>;
