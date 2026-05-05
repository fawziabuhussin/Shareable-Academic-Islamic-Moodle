/**
 * Validation schemas for LiveSession
 */
import { z } from 'zod';

/**
 * Schema for creating a new live session
 */
export const createLiveSessionSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب').max(200, 'العنوان طويل جداً'),
  scheduledAt: z.string().datetime('تاريخ غير صحيح'),
  provider: z.enum(['YOUTUBE', 'FACEBOOK', 'ZOOM', 'MEET', 'OTHER'], {
    errorMap: () => ({ message: 'نوع المنصة غير صحيح' }),
  }),
  embedUrl: z.string().url('رابط غير صحيح'),
  notes: z.string().optional(),
});

/**
 * Schema for updating an existing live session
 */
export const updateLiveSessionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  scheduledAt: z.string().datetime().optional(),
  provider: z.enum(['YOUTUBE', 'FACEBOOK', 'ZOOM', 'MEET', 'OTHER']).optional(),
  embedUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

/**
 * Type inference from schemas
 */
export type CreateLiveSessionInput = z.infer<typeof createLiveSessionSchema>;
export type UpdateLiveSessionInput = z.infer<typeof updateLiveSessionSchema>;
