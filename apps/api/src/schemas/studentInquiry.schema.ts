import { z } from 'zod';

export const submitStudentInquirySchema = z.object({
  name: z.string().min(2, 'الاسم قصير جداً').max(200),
  email: z.string().email('بريد إلكتروني غير صالح').max(320),
  phone: z.string().max(40).optional().nullable(),
  subject: z.string().min(2, 'عنوان الاستفسار مطلوب').max(300),
  body: z.string().min(10, 'نص الاستفسار قصير جداً').max(8000),
});

export const adminUpdateStudentInquirySchema = z.object({
  status: z.enum(['NEW', 'ANSWERED', 'ARCHIVED']).optional(),
  adminAnswerAr: z.string().max(12000).nullable().optional(),
  publishToFaq: z.boolean().optional(),
});

export type SubmitStudentInquiryInput = z.infer<typeof submitStudentInquirySchema>;
export type AdminUpdateStudentInquiryInput = z.infer<typeof adminUpdateStudentInquirySchema>;
