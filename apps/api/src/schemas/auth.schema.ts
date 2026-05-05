/**
 * Validation schemas for Authentication
 */
import { z } from 'zod';

/**
 * Schema for user registration
 */
export const registerSchema = z.object({
  // Step 1 - Name fields
  firstName: z.string()
    .min(2, 'الاسم الشخصي يجب أن يكون حرفين على الأقل')
    .max(50, 'الاسم الشخصي طويل جداً'),
  fatherName: z.string()
    .min(2, 'اسم الوالد يجب أن يكون حرفين على الأقل')
    .max(50, 'اسم الوالد طويل جداً'),
  familyName: z.string()
    .min(2, 'اسم العائلة يجب أن يكون حرفين على الأقل')
    .max(50, 'اسم العائلة طويل جداً'),
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string()
    .min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    .max(100, 'كلمة المرور طويلة جداً'),

  // Step 2 - Profile fields
  dateOfBirth: z.string()
    .transform(val => new Date(val))
    .refine(date => !isNaN(date.getTime()), 'تاريخ غير صالح')
    .refine(date => date < new Date(), 'تاريخ الولادة يجب أن يكون في الماضي')
    .refine(date => date > new Date('1900-01-01'), 'تاريخ الولادة غير صالح'),
  phone: z.string()
    .min(7, 'رقم الهاتف يجب أن يكون 7 أرقام على الأقل')
    .max(10, 'رقم الهاتف يجب أن يكون 10 أرقام على الأكثر')
    .regex(/^[0-9]+$/, 'رقم الهاتف يجب أن يحتوي على أرقام فقط'),
  profession: z.string()
    .min(2, 'المهنة يجب أن تكون حرفين على الأقل')
    .max(100, 'المهنة طويلة جداً'),
  gender: z.enum(['MALE', 'FEMALE'], {
    errorMap: () => ({ message: 'يرجى اختيار الجنس' }),
  }),
  idNumber: z.string()
    .length(9, 'رقم الهوية يجب أن يكون 9 أرقام بالضبط')
    .regex(/^[0-9]+$/, 'رقم الهوية يجب أن يحتوي على أرقام فقط'),
  location: z.string()
    .min(2, 'البلد يجب أن يكون حرفين على الأقل')
    .max(100, 'البلد طويل جداً'),
});

/**
 * Schema for completing profile (OAuth users)
 */
export const completeProfileSchema = z.object({
  firstName: z.string()
    .min(2, 'الاسم الشخصي يجب أن يكون حرفين على الأقل')
    .max(50, 'الاسم الشخصي طويل جداً'),
  fatherName: z.string()
    .min(2, 'اسم الوالد يجب أن يكون حرفين على الأقل')
    .max(50, 'اسم الوالد طويل جداً'),
  familyName: z.string()
    .min(2, 'اسم العائلة يجب أن يكون حرفين على الأقل')
    .max(50, 'اسم العائلة طويل جداً'),
  dateOfBirth: z.string()
    .transform(val => new Date(val))
    .refine(date => !isNaN(date.getTime()), 'تاريخ غير صالح')
    .refine(date => date < new Date(), 'تاريخ الولادة يجب أن يكون في الماضي')
    .refine(date => date > new Date('1900-01-01'), 'تاريخ الولادة غير صالح'),
  phone: z.string()
    .min(7, 'رقم الهاتف يجب أن يكون 7 أرقام على الأقل')
    .max(10, 'رقم الهاتف يجب أن يكون 10 أرقام على الأكثر')
    .regex(/^[0-9]+$/, 'رقم الهاتف يجب أن يحتوي على أرقام فقط'),
  profession: z.string()
    .min(2, 'المهنة يجب أن تكون حرفين على الأقل')
    .max(100, 'المهنة طويلة جداً'),
  gender: z.enum(['MALE', 'FEMALE'], {
    errorMap: () => ({ message: 'يرجى اختيار الجنس' }),
  }),
  idNumber: z.string()
    .length(9, 'رقم الهوية يجب أن يكون 9 أرقام بالضبط')
    .regex(/^[0-9]+$/, 'رقم الهوية يجب أن يحتوي على أرقام فقط'),
  location: z.string()
    .min(2, 'البلد يجب أن يكون حرفين على الأقل')
    .max(100, 'البلد طويل جداً'),
});

/**
 * Schema for user login
 */
export const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح').optional(),
  username: z.string().optional(),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
}).refine((data) => data.email || data.username, {
  message: 'Either email or username must be provided',
});

/**
 * Schema for Google OAuth
 */
export const googleAuthSchema = z.object({
  token: z.string().min(1, 'Google token is required'),
});

/**
 * Schema for Apple OAuth
 */
export const appleAuthSchema = z.object({
  identityToken: z.string().min(1, 'Apple identity token is required'),
  user: z.object({
    name: z.string().optional(),
  }).optional(),
});

/**
 * Schema for refresh token request
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

/**
 * Type inference from schemas
 */
export type RegisterInput = z.infer<typeof registerSchema>;
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type AppleAuthInput = z.infer<typeof appleAuthSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
