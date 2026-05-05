import { z } from 'zod';

export const updateSiteContentSettingsSchema = z.object({
  registrationUrl: z.string().url('رابط غير صالح').max(2000).optional(),
  youtubeUrl: z.string().url('رابط غير صالح').max(2000).optional(),
  mapsInfoUrl: z
    .union([z.string().url('رابط غير صالح').max(2000), z.literal('')])
    .nullable()
    .optional(),
});

export type UpdateSiteContentSettingsInput = z.infer<typeof updateSiteContentSettingsSchema>;
