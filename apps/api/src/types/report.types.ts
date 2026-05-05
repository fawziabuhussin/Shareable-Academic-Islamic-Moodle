/**
 * Report types for content error reporting - تبليغ عن خطأ بالمادة
 */

/**
 * Report type enum values
 */
export type ReportType = 
  | 'VIDEO_ERROR'      // خطأ في الفيديو
  | 'TEXT_ERROR'       // خطأ في النص
  | 'AUDIO_ERROR'      // خطأ في الصوت
  | 'RESOURCE_ERROR'   // خطأ في المرفقات
  | 'CONTENT_MISSING'  // محتوى ناقص
  | 'OTHER';           // أخرى

/**
 * Report status enum values
 */
export type ReportStatus = 
  | 'NEW'         // جديد
  | 'IN_REVIEW'   // قيد المراجعة
  | 'RESOLVED'    // تم الحل
  | 'DISMISSED';  // مرفوض

/**
 * Data required to create a new report
 */
export interface CreateReportDTO {
  courseId: string;
  lessonId: string;
  type: ReportType;
  description: string;
  timestamp?: string;
}

/**
 * Data for updating report status
 */
export interface UpdateReportDTO {
  status: 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
  reviewNote?: string;
}

/**
 * Report with all relations
 */
export interface ReportWithRelations {
  id: string;
  type: string;
  description: string;
  timestamp: string | null;
  status: string;
  reviewNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  reporter: {
    id: string;
    name: string;
    email: string;
  };
  course: {
    id: string;
    title: string;
    teacherId: string;
  };
  lesson: {
    id: string;
    title: string;
    order: number;
    module: {
      id: string;
      title: string;
      order: number;
    };
  };
  reviewer?: {
    id: string;
    name: string;
  } | null;
}

/**
 * Filters for listing reports
 */
export interface ReportFilters {
  status?: string;
  courseId?: string;
  lessonId?: string;
}
