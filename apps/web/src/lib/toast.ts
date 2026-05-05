import { toast } from 'sonner';

/**
 * Toast utility functions for consistent Arabic notifications
 * throughout the application.
 */

// Success messages
export const showSuccess = (message: string) => {
  toast.success(message, {
    duration: 4000,
  });
};

// Error messages
export const showError = (message: string) => {
  toast.error(message, {
    duration: 5000,
  });
};

// Warning messages
export const showWarning = (message: string) => {
  toast.warning(message, {
    duration: 4000,
  });
};

// Info messages
export const showInfo = (message: string) => {
  toast.info(message, {
    duration: 3000,
  });
};

// Loading toast with promise
export const showLoading = (message: string) => {
  return toast.loading(message);
};

// Dismiss a specific toast
export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};

// Promise-based toast for async operations
export const showPromise = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
) => {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  });
};

// Common Arabic messages
export const TOAST_MESSAGES = {
  // Generic
  GENERIC_ERROR: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
  NETWORK_ERROR: 'خطأ في الاتصال بالخادم. تحقق من اتصالك بالإنترنت.',
  OFFLINE: 'أنت غير متصل بالإنترنت',
  ONLINE: 'تم استعادة الاتصال بالإنترنت',
  
  // Auth
  LOGIN_SUCCESS: 'تم تسجيل الدخول بنجاح',
  LOGIN_ERROR: 'فشل تسجيل الدخول. تحقق من البيانات المدخلة.',
  LOGOUT_SUCCESS: 'تم تسجيل الخروج بنجاح',
  REGISTER_SUCCESS: 'تم إنشاء الحساب بنجاح',
  
  // Course
  ENROLL_SUCCESS: 'تم التسجيل في الدورة بنجاح',
  ENROLL_ERROR: 'فشل التسجيل في الدورة',
  LESSON_COMPLETE: 'تم إكمال الدرس بنجاح',
  
  // Exam
  EXAM_SUBMIT_SUCCESS: 'تم تسليم الامتحان بنجاح',
  EXAM_SUBMIT_ERROR: 'فشل تسليم الامتحان',
  EXAM_LOAD_ERROR: 'فشل تحميل الامتحان',
  
  // Homework
  HOMEWORK_SUBMIT_SUCCESS: 'تم تسليم الواجب بنجاح',
  HOMEWORK_SUBMIT_ERROR: 'فشل تسليم الواجب',
  
  // CRUD Operations
  CREATE_SUCCESS: 'تم الإنشاء بنجاح',
  UPDATE_SUCCESS: 'تم التحديث بنجاح',
  DELETE_SUCCESS: 'تم الحذف بنجاح',
  SAVE_SUCCESS: 'تم الحفظ بنجاح',
  
  // Validation
  FILL_REQUIRED_FIELDS: 'يرجى ملء جميع الحقول المطلوبة',
  INVALID_INPUT: 'البيانات المدخلة غير صحيحة',
  
  // Question
  QUESTION_SUBMIT_SUCCESS: 'تم إرسال السؤال بنجاح',
  QUESTION_ANSWER_SUCCESS: 'تم الرد على السؤال بنجاح',
  
  // Report
  REPORT_SUBMIT_SUCCESS: 'تم إرسال البلاغ بنجاح',
  
  // Grade
  GRADE_SUBMIT_SUCCESS: 'تم حفظ الدرجة بنجاح',
};

export default {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  loading: showLoading,
  dismiss: dismissToast,
  promise: showPromise,
  messages: TOAST_MESSAGES,
};
