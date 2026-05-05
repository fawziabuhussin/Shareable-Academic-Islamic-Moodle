/**
 * Validation schemas for Enrollment
 */
import { z } from 'zod';

/**
 * Schema for creating a new enrollment
 */
export const createEnrollmentSchema = z.object({
  courseId: z.string().uuid('معرف الدورة غير صحيح'),
});

/**
 * Schema for updating an existing enrollment
 */
export const updateEnrollmentSchema = z.object({
  status: z.enum(['ACTIVE', 'PENDING', 'CANCELED']).optional(),
});

/**
 * Type inference from schemas
 */
export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;
