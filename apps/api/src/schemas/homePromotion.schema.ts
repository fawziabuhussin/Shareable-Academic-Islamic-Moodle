import { z } from 'zod';

const safeLinkUrl = z
  .string()
  .max(2048)
  .optional()
  .nullable()
  .refine(
    (v) =>
      v == null ||
      v === '' ||
      v.startsWith('/') ||
      /^https?:\/\//i.test(v),
    { message: 'يجب أن يكون الرابط نسبياً (يبدأ بـ /) أو http(s)://' }
  );

const httpsOnlyOptional = z
  .string()
  .max(2048)
  .optional()
  .nullable()
  .refine((v) => v == null || v === '' || /^https:\/\//i.test(v), {
    message: 'يجب أن يبدأ الرابط بـ https://',
  });

export const createHomePromotionSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب').max(200),
  body: z.string().max(8000).optional().nullable(),
  imageUrl: z
    .string()
    .max(2048)
    .optional()
    .nullable()
    .refine((v) => v == null || v === '' || /^https?:\/\//i.test(v), {
      message: 'رابط الصورة يجب أن يبدأ بـ http:// أو https://',
    }),
  linkUrl: safeLinkUrl,
  linkLabel: z.string().max(120).optional().nullable(),
  linkUrlMale: safeLinkUrl,
  linkLabelMale: z.string().max(120).optional().nullable(),
  linkUrlFemale: safeLinkUrl,
  linkLabelFemale: z.string().max(120).optional().nullable(),
  zoomUrl: httpsOnlyOptional,
  youtubeUrl: httpsOnlyOptional,
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
});

export const updateHomePromotionSchema = createHomePromotionSchema.partial();
