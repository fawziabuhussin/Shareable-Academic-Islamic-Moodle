/**
 * Validation schemas for Playlist operations
 */
import { z } from 'zod';

/**
 * Schema for creating a course from a YouTube playlist
 */
export const createCourseFromPlaylistSchema = z.object({
  playlistUrl: z.string().min(1, 'رابط قائمة التشغيل مطلوب'),
  courseTitle: z.string().min(1, 'عنوان الدورة مطلوب').max(200, 'العنوان طويل جداً'),
  courseDescription: z.string().max(2000).optional(),
  categoryId: z.string().min(1, 'معرف الفئة مطلوب'),
  coverImage: z.string().url().optional(),
  price: z.number().min(0).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  teacherId: z.string().optional(), // Only for admins
});

/**
 * Schema for creating a module from a YouTube playlist within an existing course
 */
export const createModuleFromPlaylistSchema = z.object({
  courseId: z.string().min(1, 'معرف الدورة مطلوب'),
  moduleTitle: z.string().min(1, 'عنوان الوحدة مطلوب').max(200, 'العنوان طويل جداً'),
  playlistUrl: z.string().min(1, 'رابط قائمة التشغيل مطلوب'),
});

export const importLessonsFromPlaylistSchema = z.object({
  moduleId: z.string().uuid('معرف الوحدة غير صالح'),
  playlistUrl: z.string().min(1, 'رابط قائمة التشغيل مطلوب'),
});

/**
 * Type inference from schemas
 */
export type CreateCourseFromPlaylistInput = z.infer<typeof createCourseFromPlaylistSchema>;
export type CreateModuleFromPlaylistInput = z.infer<typeof createModuleFromPlaylistSchema>;
