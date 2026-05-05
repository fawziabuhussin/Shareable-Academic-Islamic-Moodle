/**
 * Validation schemas for User
 */
import { z } from 'zod';

/**
 * Schema for updating an existing user
 */
export const updateUserSchema = z.object({
  firstName: z.string().min(2, 'الاسم الشخصي يجب أن يكون حرفين على الأقل').max(50, 'الاسم الشخصي طويل جداً').optional(),
  fatherName: z.string().min(2, 'اسم الوالد يجب أن يكون حرفين على الأقل').max(50, 'اسم الوالد طويل جداً').optional(),
  familyName: z.string().min(2, 'اسم العائلة يجب أن يكون حرفين على الأقل').max(50, 'اسم العائلة طويل جداً').optional(),
  email: z.string().email('البريد الإلكتروني غير صالح').optional(),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT'], {
    errorMap: () => ({ message: 'الدور غير صالح' })
  }).optional(),
  blocked: z.boolean().optional(),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل').max(100, 'كلمة المرور طويلة جداً').optional(),
  dateOfBirth: z.string()
    .transform(val => new Date(val))
    .refine(date => !isNaN(date.getTime()), 'تاريخ غير صالح')
    .refine(date => date < new Date(), 'تاريخ الولادة يجب أن يكون في الماضي')
    .refine(date => date > new Date('1900-01-01'), 'تاريخ الولادة غير صالح')
    .optional(),
  phone: z.string()
    .min(7, 'رقم الهاتف يجب أن يكون 7 أرقام على الأقل')
    .max(10, 'رقم الهاتف يجب أن يكون 10 أرقام على الأكثر')
    .regex(/^[0-9]+$/, 'رقم الهاتف يجب أن يحتوي على أرقام فقط')
    .optional(),
  profession: z.string().min(2, 'المهنة يجب أن تكون حرفين على الأقل').max(100, 'المهنة طويلة جداً').optional(),
  gender: z.enum(['MALE', 'FEMALE'], {
    errorMap: () => ({ message: 'يرجى اختيار الجنس' }),
  }).optional(),
  idNumber: z.string()
    .length(9, 'رقم الهوية يجب أن يكون 9 أرقام بالضبط')
    .regex(/^[0-9]+$/, 'رقم الهوية يجب أن يحتوي على أرقام فقط')
    .optional(),
  location: z.string()
    .min(2, 'البلد يجب أن يكون حرفين على الأقل')
    .max(100, 'البلد طويل جداً')
    .optional(),
});

/**
 * Schema for creating a new user by admin (all fields required)
 */
export const createUserSchema = z.object({
  // Name fields
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
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT'], {
    errorMap: () => ({ message: 'الدور غير صالح' })
  }),
  // Profile fields (required for admin-created users)
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
 * Schema for creating a new teacher (alias for createUserSchema with TEACHER role)
 */
export const createTeacherSchema = createUserSchema.omit({ role: true });

/**
 * Schema for self-profile update (limited fields - no role, blocked, password, email)
 */
export const updateSelfProfileSchema = z.object({
  firstName: z.string().min(2, 'الاسم الشخصي يجب أن يكون حرفين على الأقل').max(50, 'الاسم الشخصي طويل جداً').optional(),
  fatherName: z.string().min(2, 'اسم الوالد يجب أن يكون حرفين على الأقل').max(50, 'اسم الوالد طويل جداً').optional(),
  familyName: z.string().min(2, 'اسم العائلة يجب أن يكون حرفين على الأقل').max(50, 'اسم العائلة طويل جداً').optional(),
  dateOfBirth: z.string()
    .transform(val => new Date(val))
    .refine(date => !isNaN(date.getTime()), 'تاريخ غير صالح')
    .refine(date => date < new Date(), 'تاريخ الولادة يجب أن يكون في الماضي')
    .refine(date => date > new Date('1900-01-01'), 'تاريخ الولادة غير صالح')
    .optional(),
  phone: z.string()
    .min(7, 'رقم الهاتف يجب أن يكون 7 أرقام على الأقل')
    .max(10, 'رقم الهاتف يجب أن يكون 10 أرقام على الأكثر')
    .regex(/^[0-9]+$/, 'رقم الهاتف يجب أن يحتوي على أرقام فقط')
    .optional(),
  profession: z.string().min(2, 'المهنة يجب أن تكون حرفين على الأقل').max(100, 'المهنة طويلة جداً').optional(),
  gender: z.enum(['MALE', 'FEMALE'], {
    errorMap: () => ({ message: 'يرجى اختيار الجنس' }),
  }).optional(),
  location: z.string()
    .min(2, 'البلد يجب أن يكون حرفين على الأقل')
    .max(100, 'البلد طويل جداً')
    .optional(),
});

/**
 * Schema for changing password
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
  newPassword: z.string()
    .min(6, 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل')
    .max(100, 'كلمة المرور طويلة جداً'),
  confirmPassword: z.string().min(1, 'تأكيد كلمة المرور مطلوب'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'كلمة المرور الجديدة وتأكيدها غير متطابقتين',
  path: ['confirmPassword'],
});

/**
 * Type inference from schemas
 */
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateSelfProfileInput = z.infer<typeof updateSelfProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
