/**
 * Report Manager
 * Business logic layer for content error reporting - تبليغ عن خطأ بالمادة
 */
import { reportRepository } from '../repositories/report.repository';
import { enrollmentRepository } from '../repositories/enrollment.repository';
import { lessonRepository } from '../repositories/lesson.repository';
import { AuthContext, PaginationParams, PaginatedResponse } from '../types/common.types';
import { CreateReportDTO, UpdateReportDTO, ReportFilters, ReportWithRelations } from '../types/report.types';

/**
 * Result types for manager operations
 */
export interface ReportResult {
  success: boolean;
  data?: ReportWithRelations;
  error?: { status: number; message: string };
}

export interface ReportsListResult {
  success: boolean;
  data?: ReportWithRelations[];
  error?: { status: number; message: string };
}

export interface ReportCountResult {
  success: boolean;
  data?: { count: number };
  error?: { status: number; message: string };
}

export interface ReportsPaginatedResult {
  success: boolean;
  data?: PaginatedResponse<ReportWithRelations>;
  error?: { status: number; message: string };
}

export class ReportManager {
  /**
   * Create a new report (Student)
   * Students can only report on courses they are enrolled in
   */
  async createReport(
    auth: AuthContext,
    data: CreateReportDTO
  ): Promise<ReportResult> {
    // Verify the lesson exists and belongs to the course
    const lesson = await lessonRepository.findById(data.lessonId);
    if (!lesson) {
      return {
        success: false,
        error: { status: 404, message: 'الدرس غير موجود' },
      };
    }

    // Get the course ID from the lesson's module
    const lessonCourseId = lesson.module?.course?.id;
    if (lessonCourseId !== data.courseId) {
      return {
        success: false,
        error: { status: 400, message: 'الدرس لا ينتمي لهذه الدورة' },
      };
    }

    // Check if user is enrolled in the course (unless admin)
    if (auth.role !== 'ADMIN') {
      const enrollments = await enrollmentRepository.findByUserIdUnpaginated(auth.userId);
      const isEnrolled = enrollments.some(
        (e: any) => e.courseId === data.courseId && e.status === 'ACTIVE'
      );

      if (!isEnrolled) {
        return {
          success: false,
          error: { status: 403, message: 'يجب أن تكون مسجلاً في الدورة للتبليغ عن خطأ' },
        };
      }
    }

    // Create the report
    const report = await reportRepository.create(auth.userId, data);

    return {
      success: true,
      data: report as ReportWithRelations,
    };
  }

  /**
   * Get reports submitted by the current user (Student only - only their own)
   */
  async getMyReports(auth: AuthContext): Promise<ReportsListResult> {
    if (auth.role !== 'STUDENT') {
      return {
        success: false,
        error: { status: 403, message: 'غير مصرح لك بالوصول' },
      };
    }
    const reports = await reportRepository.findByReporterId(auth.userId);

    return {
      success: true,
      data: reports as ReportWithRelations[],
    };
  }

  /**
   * Get reports submitted by the current student with pagination (only their own)
   */
  async getMyReportsPaginated(
    auth: AuthContext,
    pagination?: PaginationParams
  ): Promise<ReportsPaginatedResult> {
    if (auth.role !== 'STUDENT') {
      return {
        success: false,
        error: { status: 403, message: 'غير مصرح لك بالوصول' },
      };
    }
    const result = await reportRepository.findByReporterIdPaginated(auth.userId, pagination);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get all reports (Admin) or reports for teacher's courses (Teacher)
   */
  async getReports(
    auth: AuthContext,
    filters: ReportFilters = {}
  ): Promise<ReportsListResult> {
    let reports;

    if (auth.role === 'ADMIN') {
      // Admin sees all reports
      reports = await reportRepository.findAll(filters);
    } else if (auth.role === 'TEACHER') {
      // Teacher sees reports for their courses only
      reports = await reportRepository.findByTeacherId(auth.userId, filters);
    } else {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول' },
      };
    }

    return {
      success: true,
      data: reports as ReportWithRelations[],
    };
  }

  /**
   * Get all reports with pagination (Admin) or reports for teacher's courses with pagination (Teacher)
   */
  async getReportsPaginated(
    auth: AuthContext,
    filters: ReportFilters = {},
    pagination?: PaginationParams
  ): Promise<ReportsPaginatedResult> {
    let result;

    if (auth.role === 'ADMIN') {
      // Admin sees all reports
      result = await reportRepository.findAllPaginated(filters, pagination);
    } else if (auth.role === 'TEACHER') {
      // Teacher sees reports for their courses only
      result = await reportRepository.findByTeacherIdPaginated(auth.userId, filters, pagination);
    } else {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول' },
      };
    }

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get count of new reports (for badge)
   */
  async getNewCount(auth: AuthContext): Promise<ReportCountResult> {
    let count;

    if (auth.role === 'ADMIN') {
      count = await reportRepository.countNew();
    } else if (auth.role === 'TEACHER') {
      count = await reportRepository.countNewByTeacherId(auth.userId);
    } else {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول' },
      };
    }

    return {
      success: true,
      data: { count },
    };
  }

  /**
   * Get a single report by ID
   */
  async getReport(
    auth: AuthContext,
    reportId: string
  ): Promise<ReportResult> {
    const report = await reportRepository.findById(reportId);

    if (!report) {
      return {
        success: false,
        error: { status: 404, message: 'التبليغ غير موجود' },
      };
    }

    // Check authorization
    const isReporter = report.reporterId === auth.userId;
    const isAdmin = auth.role === 'ADMIN';
    const isCourseTeacher = auth.role === 'TEACHER' && report.course.teacherId === auth.userId;

    if (!isReporter && !isAdmin && !isCourseTeacher) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول' },
      };
    }

    return {
      success: true,
      data: report as ReportWithRelations,
    };
  }

  /**
   * Update report status (Admin/Teacher)
   */
  async updateStatus(
    auth: AuthContext,
    reportId: string,
    data: UpdateReportDTO
  ): Promise<ReportResult> {
    // Find the report
    const report = await reportRepository.findById(reportId);

    if (!report) {
      return {
        success: false,
        error: { status: 404, message: 'التبليغ غير موجود' },
      };
    }

    // Check authorization
    const isAdmin = auth.role === 'ADMIN';
    const isCourseTeacher = auth.role === 'TEACHER' && report.course.teacherId === auth.userId;

    if (!isAdmin && !isCourseTeacher) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بتحديث هذا التبليغ' },
      };
    }

    // Update the report
    const updatedReport = await reportRepository.updateStatus(reportId, auth.userId, data);

    return {
      success: true,
      data: updatedReport as ReportWithRelations,
    };
  }

  /**
   * Delete a report (Admin or Teacher of the course)
   */
  async deleteReport(
    auth: AuthContext,
    reportId: string
  ): Promise<{ success: boolean; error?: { status: number; message: string } }> {
    const report = await reportRepository.findById(reportId);

    if (!report) {
      return {
        success: false,
        error: { status: 404, message: 'التبليغ غير موجود' },
      };
    }

    // Check authorization: Admin, course teacher, or the reporter (student) who created it
    const isAdmin = auth.role === 'ADMIN';
    const isCourseTeacher = auth.role === 'TEACHER' && report.course.teacherId === auth.userId;
    const isReporter = report.reporterId === auth.userId;

    if (!isAdmin && !isCourseTeacher && !isReporter) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بحذف هذا التبليغ' },
      };
    }

    await reportRepository.delete(reportId);

    return {
      success: true,
    };
  }
}

/**
 * Singleton instance
 */
export const reportManager = new ReportManager();
