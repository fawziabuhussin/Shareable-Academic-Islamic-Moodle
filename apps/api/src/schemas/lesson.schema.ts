/**
 * Validation schemas for Lesson
 */
import { z } from 'zod';

/**
 * Schema for creating a new lesson
 */
export const createLessonSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب').max(200, 'العنوان طويل جداً'),
  type: z.enum(['VIDEO', 'TEXT', 'LIVE', 'PLAYLIST'], {
    errorMap: () => ({ message: 'نوع الدرس غير صحيح' }),
  }),
  youtubeUrl: z.union([z.string().url('رابط YouTube غير صحيح'), z.literal('')]).optional(),
  youtubePlaylistId: z.string().optional(),
  textContent: z.string().optional(),
  durationMinutes: z.number().int().min(0, 'المدة يجب أن تكون أكبر من أو تساوي 0').optional(),
  order: z.number().int().optional(),
}).refine((data) => {
  if (data.type === 'VIDEO' || data.type === 'LIVE' || data.type === 'PLAYLIST') {
    return data.youtubeUrl && data.youtubeUrl.trim() !== '';
  }
  if (data.type === 'TEXT') {
    return data.textContent && data.textContent.trim() !== '';
  }
  return true;
}, {
  message: 'يجب إدخال رابط YouTube للمحتوى المرئي أو محتوى نصي للمحتوى النصي',
});

/**
 * Schema for updating an existing lesson
 */
export const updateLessonSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  type: z.enum(['VIDEO', 'TEXT', 'LIVE', 'PLAYLIST']).optional(),
  youtubeUrl: z.union([z.string().url(), z.literal('')]).optional(),
  youtubePlaylistId: z.string().optional(),
  textContent: z.string().optional(),
  durationMinutes: z.number().int().min(0).optional(),
  order: z.number().int().optional(),
});

/**
 * Schema for reordering lessons within a module
 */
export const reorderLessonsSchema = z.object({
  moduleId: z.string().uuid('معرّف الوحدة غير صحيح'),
  lessonIds: z.array(z.string().uuid('معرّف الدرس غير صحيح')).min(1, 'يجب تحديد درس واحد على الأقل'),
});

/**
 * Type inference from schemas
 */
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type ReorderLessonsInput = z.infer<typeof reorderLessonsSchema>;
