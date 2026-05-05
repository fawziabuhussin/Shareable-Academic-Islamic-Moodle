/**
 * Validation schemas for Category
 */
import { z } from 'zod';

/**
 * Schema for creating a new category
 */
export const createCategorySchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب').max(100, 'العنوان طويل جداً'),
  description: z.string().optional(),
  order: z.number().int().optional(),
});

/**
 * Schema for updating an existing category
 */
export const updateCategorySchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  order: z.number().int().optional(),
});

/**
 * Type inference from schemas
 */
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
