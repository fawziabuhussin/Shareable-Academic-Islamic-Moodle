import { z } from 'zod';

export const createPublicFaqSchema = z.object({
  questionAr: z.string().min(2).max(4000),
  answerAr: z.string().min(2).max(12000),
  sortOrder: z.number().int().optional(),
  isVisible: z.boolean().optional(),
});

export const updatePublicFaqSchema = z.object({
  questionAr: z.string().min(2).max(4000).optional(),
  answerAr: z.string().min(2).max(12000).optional(),
  sortOrder: z.number().int().optional(),
  isVisible: z.boolean().optional(),
});
