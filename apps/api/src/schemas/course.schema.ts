/**
 * Validation schemas for Course
 */
import { z } from 'zod';

/**
 * Schema for creating a new course
 */
export const createCourseSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب').max(200, 'العنوان طويل جداً'),
  description: z.string().optional(),
  coverImage: z.union([z.string().url('رابط الصورة غير صحيح'), z.literal('')]).optional(),
  categoryId: z.string().min(1, 'الفئة غير صحيحة'),
  price: z.number().min(0, 'السعر يجب أن يكون أكبر من أو يساوي 0').optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  lifecycle: z.enum(['DEFAULT', 'ONGOING']).optional(),
  readingWeight: z.number().min(0).max(100).default(100),
  teacherId: z.string().uuid().optional(), // Only for admin creating course for another teacher
  prerequisiteCourseIds: z.array(z.string().uuid()).optional(),
});

/**
 * Schema for updating an existing course
 */
export const updateCourseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.union([z.string(), z.literal('')]).optional(),
  coverImage: z.union([z.string().url(), z.literal('')]).optional(),
  categoryId: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  lifecycle: z.enum(['DEFAULT', 'ONGOING']).optional(),
  readingWeight: z.number().min(0).max(100).optional(),
  teacherId: z.string().uuid().optional(),
  prerequisiteCourseIds: z.array(z.string().uuid()).optional(),
});

/**
 * Schema for bulk updating course weights
 */
export const updateCourseWeightsSchema = z.object({
  readingWeight: z.number().min(0).max(100),
  assessments: z.array(z.object({
    id: z.string().uuid(),
    type: z.enum(['EXAM', 'HOMEWORK', 'QUIZ']),
    weightPercent: z.number().min(0).max(100),
  })),
});

/**
 * Type inference from schemas
 */
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type UpdateCourseWeightsInput = z.infer<typeof updateCourseWeightsSchema>;
