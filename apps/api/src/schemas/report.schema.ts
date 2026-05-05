/**
 * Report validation schemas
 */
import { z } from 'zod';

/**
 * Schema for creating a new report
 */
export const createReportSchema = z.object({
  courseId: z.string().uuid('معرف الدورة غير صالح'),
  lessonId: z.string().uuid('معرف الدرس غير صالح'),
  type: z.enum([
    'VIDEO_ERROR',
    'TEXT_ERROR', 
    'AUDIO_ERROR',
    'RESOURCE_ERROR',
    'CONTENT_MISSING',
    'OTHER'
  ], {
    errorMap: () => ({ message: 'نوع التبليغ غير صالح' })
  }),
  description: z
    .string()
    .min(1, 'يرجى إدخال وصف للخطأ')
    .max(1000, 'يجب ألا يتجاوز الوصف 1000 حرف'),
  timestamp: z
    .string()
    .regex(/^(\d{1,2}:)?\d{1,2}:\d{2}$/, 'صيغة الوقت غير صالحة (مثال: 05:23 أو 1:05:23)')
    .optional(),
});

/**
 * Schema for updating report status
 */
export const updateReportSchema = z.object({
  status: z.enum(['IN_REVIEW', 'RESOLVED', 'DISMISSED'], {
    errorMap: () => ({ message: 'حالة التبليغ غير صالحة' })
  }),
  reviewNote: z
    .string()
    .max(500, 'يجب ألا تتجاوز ملاحظة المراجعة 500 حرف')
    .optional(),
});

/**
 * Schema for report filters
 */
export const reportFiltersSchema = z.object({
  status: z.enum(['NEW', 'IN_REVIEW', 'RESOLVED', 'DISMISSED']).optional(),
  courseId: z.string().uuid().optional(),
  lessonId: z.string().uuid().optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
export type ReportFiltersInput = z.infer<typeof reportFiltersSchema>;
