/**
 * Validation schemas for Progress
 */
import { z } from 'zod';

/**
 * Schema for completing a lesson
 * Note: lessonId comes from URL params, not body
 */
export const completeLessonSchema = z.object({
  // No body parameters needed - lessonId comes from route params
});

/**
 * Type inference from schemas
 */
export type CompleteLessonInput = z.infer<typeof completeLessonSchema>;
