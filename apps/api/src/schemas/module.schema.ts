/**
 * Validation schemas for Module
 */
import { z } from 'zod';

/**
 * Schema for creating a new module
 */
export const createModuleSchema = z.object({
  title: z.string().min(1, 'عنوان الوحدة مطلوب').max(200, 'العنوان طويل جداً'),
  order: z.number().int().optional(),
});

/**
 * Schema for updating an existing module
 */
export const updateModuleSchema = z.object({
  title: z.string().min(1, 'عنوان الوحدة مطلوب').max(200, 'العنوان طويل جداً').optional(),
  order: z.number().int().optional(),
});

/**
 * Type inference from schemas
 */
export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
