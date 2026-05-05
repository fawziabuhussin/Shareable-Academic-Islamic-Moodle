/**
 * Homework Manager
 * Business logic layer for homework management
 */
import { homeworkRepository } from '../repositories/homework.repository';
import { authorizationService } from '../services/authorization.service';
import { AuthContext, PaginationParams, PaginatedResponse } from '../types/common.types';
import {
  HomeworkWithRelations,
  HomeworkSubmissionWithRelations,
  CreateHomeworkDTO,
  UpdateHomeworkDTO,
  SubmitHomeworkDTO,
  GradeHomeworkDTO,
} from '../types/homework.types';
import { prisma } from '../utils/prisma';
import { validateCourseWeights } from '../utils/grading';

/**
 * Result types for manager operations
 */
export interface HomeworkListResult {
  success: boolean;
  data?: HomeworkWithRelations[];
  error?: { status: number; message: string };
}

export interface HomeworkPaginatedResult {
  success: boolean;
  data?: PaginatedResponse<HomeworkWithRelations>;
  error?: { status: number; message: string };
}

export interface HomeworkResult {
  success: boolean;
  data?: HomeworkWithRelations;
  error?: { status: number; message: string };
}

export interface SubmissionResult {
  success: boolean;
  data?: HomeworkSubmissionWithRelations;
  error?: { status: number; message: string };
}

export interface SubmissionListResult {
  success: boolean;
  data?: HomeworkSubmissionWithRelations[];
  error?: { status: number; message: string };
}

export interface DeleteResult {
  success: boolean;
  error?: { status: number; message: string };
}

export class HomeworkManager {
  /**
   * List all homework for a course with pagination
   */
  async listHomework(auth: AuthContext, courseId: string, pagination?: PaginationParams): Promise<HomeworkPaginatedResult> {
    // Check authorization
    const access = await authorizationService.checkReadAccess(auth, { type: 'course', id: courseId });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'أنت غير مسجل في هذه الدورة' },
      };
    }

    const result = await homeworkRepository.findByCourseId(courseId, auth.userId, pagination);
    return { success: true, data: result };
  }

  /**
   * List all homework for a course without pagination (backward compatible)
   */
  async listHomeworkUnpaginated(auth: AuthContext, courseId: string): Promise<HomeworkListResult> {
    // Check authorization
    const access = await authorizationService.checkReadAccess(auth, { type: 'course', id: courseId });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'أنت غير مسجل في هذه الدورة' },
      };
    }

    const homework = await homeworkRepository.findByCourseIdUnpaginated(courseId, auth.userId);
    return { success: true, data: homework };
  }

  /**
   * Get a single homework
   */
  async getHomework(auth: AuthContext, homeworkId: string, courseId?: string): Promise<HomeworkResult> {
    const homework = await homeworkRepository.findById(homeworkId, auth.userId);

    if (!homework) {
      return {
        success: false,
        error: { status: 404, message: 'الواجب غير موجود' },
      };
    }

    // If courseId provided, verify it matches
    if (courseId && homework.courseId !== courseId) {
      return {
        success: false,
        error: { status: 404, message: 'الواجب غير موجود' },
      };
    }

    // Check access
    const isEnrolled = homework.course?.enrollments?.some(
      (e) => e.userId === auth.userId && e.status === 'ACTIVE'
    );
    const isTeacher = homework.course?.teacherId === auth.userId;
    const isAdmin = auth.role === 'ADMIN';

    if (!isEnrolled && !isTeacher && !isAdmin) {
      return {
        success: false,
        error: { status: 403, message: 'غير مصرح لك بالوصول لهذا الواجب' },
      };
    }

    return { success: true, data: homework };
  }

  /**
   * Create a new homework
   */
  async createHomework(
    auth: AuthContext,
    courseId: string,
    data: CreateHomeworkDTO
  ): Promise<HomeworkResult> {
    // Check authorization
    const access = await authorizationService.checkWriteAccess(auth, { type: 'course', id: courseId });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالإضافة' },
      };
    }

    const homework = await homeworkRepository.create(data, courseId);

    // Validate total course weights (warning, not blocking)
    let weightWarning: string | undefined;
    const [exams, homeworks, quizzes, courseData] = await Promise.all([
      prisma.exam.findMany({ where: { courseId }, select: { weightPercent: true } }),
      prisma.homework.findMany({ where: { courseId }, select: { weightPercent: true } }),
      prisma.quiz.findMany({ where: { courseId }, select: { weightPercent: true } }),
      prisma.course.findUnique({ where: { id: courseId }, select: { readingWeight: true } }),
    ]);
    const validation = validateCourseWeights(courseData?.readingWeight || 0, [...exams, ...homeworks, ...quizzes]);
    if (!validation.isValid) {
      weightWarning = `إجمالي الأوزان: ${validation.total}% (المتبقي: ${validation.remaining}%)`;
    }

    return { success: true, data: { ...homework, weightWarning } as any };
  }

  /**
   * Update an existing homework
   */
  async updateHomework(
    auth: AuthContext,
    courseId: string,
    homeworkId: string,
    data: UpdateHomeworkDTO
  ): Promise<HomeworkResult> {
    // Check authorization
    const access = await authorizationService.checkWriteAccess(auth, { type: 'course', id: courseId });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالتعديل' },
      };
    }

    // Verify homework exists and belongs to course
    const exists = await homeworkRepository.existsInCourse(homeworkId, courseId);
    if (!exists) {
      return {
        success: false,
        error: { status: 404, message: 'الواجب غير موجود' },
      };
    }

    const homework = await homeworkRepository.update(homeworkId, data);

    // Validate total course weights (warning, not blocking)
    let weightWarning: string | undefined;
    const [exams, homeworks, quizzes, courseData] = await Promise.all([
      prisma.exam.findMany({ where: { courseId }, select: { weightPercent: true } }),
      prisma.homework.findMany({ where: { courseId }, select: { weightPercent: true } }),
      prisma.quiz.findMany({ where: { courseId }, select: { weightPercent: true } }),
      prisma.course.findUnique({ where: { id: courseId }, select: { readingWeight: true } }),
    ]);
    const validation = validateCourseWeights(courseData?.readingWeight || 0, [...exams, ...homeworks, ...quizzes]);
    if (!validation.isValid) {
      weightWarning = `إجمالي الأوزان: ${validation.total}% (المتبقي: ${validation.remaining}%)`;
    }

    return { success: true, data: { ...homework, weightWarning } as any };
  }

  /**
   * Delete a homework
   */
  async deleteHomework(
    auth: AuthContext,
    homeworkId: string,
    courseId?: string
  ): Promise<DeleteResult> {
    // If courseId not provided, look it up from the homework
    if (!courseId) {
      const homework = await homeworkRepository.findById(homeworkId, auth.userId);
      if (!homework) {
        return {
          success: false,
          error: { status: 404, message: 'الواجب غير موجود' },
        };
      }
      courseId = homework.courseId;
    }

    // Check authorization
    const access = await authorizationService.checkWriteAccess(auth, { type: 'course', id: courseId });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالحذف' },
      };
    }

    // Verify homework exists and belongs to course
    const exists = await homeworkRepository.existsInCourse(homeworkId, courseId);
    if (!exists) {
      return {
        success: false,
        error: { status: 404, message: 'الواجب غير موجود' },
      };
    }

    await homeworkRepository.delete(homeworkId);
    return { success: true };
  }

  /**
   * Submit homework
   */
  async submitHomework(
    auth: AuthContext,
    homeworkId: string,
    data: SubmitHomeworkDTO
  ): Promise<SubmissionResult> {
    const homework = await prisma.homework.findUnique({
      where: { id: homeworkId },
      include: {
        course: {
          include: {
            enrollments: {
              where: {
                userId: auth.userId,
                status: 'ACTIVE',
              },
            },
          },
        },
      },
    });

    if (!homework) {
      return {
        success: false,
        error: { status: 404, message: 'الواجب غير موجود' },
      };
    }

    const isEnrolled = homework.course.enrollments.length > 0;
    if (!isEnrolled && auth.role !== 'ADMIN') {
      return {
        success: false,
        error: { status: 403, message: 'أنت غير مسجل في هذه الدورة' },
      };
    }

    // Check if already submitted
    const hasSubmitted = await homeworkRepository.hasSubmission(homeworkId, auth.userId);
    if (hasSubmitted) {
      return {
        success: false,
        error: { status: 400, message: 'تم تسليم هذا الواجب مسبقاً' },
      };
    }

    const submission = await homeworkRepository.submitHomework(homeworkId, auth.userId, data);
    return { success: true, data: submission };
  }

  /**
   * Get all submissions for a homework (Teacher/Admin)
   */
  async getSubmissions(
    auth: AuthContext,
    courseId: string,
    homeworkId: string
  ): Promise<SubmissionListResult> {
    // Check authorization
    const access = await authorizationService.checkWriteAccess(auth, { type: 'course', id: courseId });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول' },
      };
    }

    // Verify homework exists and belongs to course
    const exists = await homeworkRepository.existsInCourse(homeworkId, courseId);
    if (!exists) {
      return {
        success: false,
        error: { status: 404, message: 'الواجب غير موجود' },
      };
    }

    const submissions = await homeworkRepository.getSubmissions(homeworkId);
    return { success: true, data: submissions };
  }

  /**
   * Grade a homework submission (Teacher/Admin)
   */
  async gradeSubmission(
    auth: AuthContext,
    courseId: string,
    homeworkId: string,
    submissionId: string,
    data: GradeHomeworkDTO
  ): Promise<SubmissionResult> {
    // Check authorization
    const access = await authorizationService.checkWriteAccess(auth, { type: 'course', id: courseId });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول' },
      };
    }

    // Verify homework exists
    const homework = await prisma.homework.findUnique({
      where: { id: homeworkId },
    });

    if (!homework || homework.courseId !== courseId) {
      return {
        success: false,
        error: { status: 404, message: 'الواجب غير موجود' },
      };
    }

    // Verify submission exists
    const existingSubmission = await homeworkRepository.getSubmissionById(submissionId);
    if (!existingSubmission || existingSubmission.homeworkId !== homeworkId) {
      return {
        success: false,
        error: { status: 404, message: 'التسليم غير موجود' },
      };
    }

    const submission = await homeworkRepository.gradeSubmission(submissionId, data);

    return { success: true, data: submission };
  }
}

/**
 * Singleton instance
 */
export const homeworkManager = new HomeworkManager();
