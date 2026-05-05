import { z } from 'zod';

const timeRe = /^([01]?\d|2[0-3]):[0-5]\d$/;

export const weeklyWindowSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  start: z.string().regex(timeRe, 'صيغة الوقت يجب أن تكون HH:mm'),
  end: z.string().regex(timeRe, 'صيغة الوقت يجب أن تكون HH:mm'),
});

export const updateZoomLiveSettingsSchema = z.object({
  zoomUrl: z
    .string()
    .max(2000)
    .refine(
      (s) => s === '' || /^https:\/\//i.test(s),
      'رابط الزووم يجب أن يبدأ بـ https:// أو يُترك فارغاً'
    )
    .optional(),
  timezone: z.string().min(1).max(120).optional(),
  weeklySchedule: z.array(weeklyWindowSchema).max(50).optional(),
  manualOverride: z.enum(['AUTO', 'FORCE_LIVE', 'FORCE_OFF']).optional(),
  showButton: z.boolean().optional(),
  nextSessionMessageAr: z.string().max(8000).nullable().optional(),
  buttonLabelAr: z.string().min(1).max(200).optional(),
});

export type UpdateZoomLiveSettingsInput = z.infer<typeof updateZoomLiveSettingsSchema>;
