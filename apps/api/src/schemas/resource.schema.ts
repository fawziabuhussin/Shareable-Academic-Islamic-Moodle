/**
 * Validation schemas for Resource entity
 * These schemas are used to validate request data before processing
 */
import { z } from 'zod';

/**
 * Schema for creating a new resource
 */
export const createResourceSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب').max(200, 'العنوان طويل جداً'),
  description: z.string().max(1000, 'الوصف طويل جداً').optional(),
  url: z.string().url('الرابط غير صحيح'),
});

/**
 * Schema for updating an existing resource
 */
export const updateResourceSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  url: z.string().url().optional(),
});

/**
 * Type inference from schemas
 */
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
