/**
 * Lesson Manager
 * Business logic layer for lesson management
 */
import { lessonRepository } from '../repositories/lesson.repository';
import { authorizationService } from '../services/authorization.service';
import { AuthContext } from '../types/common.types';
import { CreateLessonDTO, UpdateLessonDTO, LessonWithRelations } from '../types/lesson.types';
import { prisma } from '../utils/prisma';

/**
 * Result types for manager operations
 */
export interface LessonListResult {
  success: boolean;
  data?: LessonWithRelations[];
  error?: { status: number; message: string };
}

export interface LessonResult {
  success: boolean;
  data?: LessonWithRelations;
  error?: { status: number; message: string };
}

export interface DeleteResult {
  success: boolean;
  error?: { status: number; message: string };
}

export class LessonManager {
  /**
   * Get a single lesson with authorization check
   */
  async getLesson(auth: AuthContext, lessonId: string): Promise<LessonResult> {
    const lesson = await lessonRepository.findById(lessonId);

    if (!lesson) {
      return {
        success: false,
        error: { status: 404, message: 'Lesson not found' },
      };
    }

    // Check access - user must be enrolled, teacher, or admin
    const isEnrolled = lesson.module?.course.enrollments?.some(
      (e) => e.userId === auth.userId && e.status === 'ACTIVE'
    );
    const isTeacher = lesson.module?.course.teacherId === auth.userId;
    const isAdmin = auth.role === 'ADMIN';

    if (!isEnrolled && !isTeacher && !isAdmin) {
      return {
        success: false,
        error: { status: 403, message: 'You must be enrolled in this course' },
      };
    }

    return { success: true, data: lesson };
  }

  /**
   * Create a new lesson
   */
  async createLesson(
    auth: AuthContext,
    moduleId: string,
    data: CreateLessonDTO
  ): Promise<LessonResult> {
    // Verify module ownership through course
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });

    if (!module) {
      return {
        success: false,
        error: { status: 404, message: 'Module not found' },
      };
    }

    // Check authorization
    const access = await authorizationService.checkWriteAccess(auth, {
      type: 'course',
      id: module.course.id,
    });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالإضافة' },
      };
    }

    const lesson = await lessonRepository.create(data, moduleId);
    return { success: true, data: lesson };
  }

  /**
   * Update an existing lesson
   */
  async updateLesson(
    auth: AuthContext,
    lessonId: string,
    data: UpdateLessonDTO
  ): Promise<LessonResult> {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: { course: true },
        },
      },
    });

    if (!lesson) {
      return {
        success: false,
        error: { status: 404, message: 'Lesson not found' },
      };
    }

    // Check authorization
    const access = await authorizationService.checkWriteAccess(auth, {
      type: 'course',
      id: lesson.module.course.id,
    });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالتعديل' },
      };
    }

    const updatedLesson = await lessonRepository.update(lessonId, data);
    return { success: true, data: updatedLesson };
  }

  /**
   * Delete a lesson
   */
  async deleteLesson(auth: AuthContext, lessonId: string): Promise<DeleteResult> {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: { course: true },
        },
      },
    });

    if (!lesson) {
      return {
        success: false,
        error: { status: 404, message: 'Lesson not found' },
      };
    }

    // Check authorization
    const access = await authorizationService.checkWriteAccess(auth, {
      type: 'course',
      id: lesson.module.course.id,
    });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالحذف' },
      };
    }

    await lessonRepository.delete(lessonId);
    return { success: true };
  }

  /**
   * Reorder lessons within a module
   */
  async reorderLessons(
    auth: AuthContext,
    moduleId: string,
    lessonIds: string[]
  ): Promise<DeleteResult> {
    // Verify module exists and get course for authorization
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });

    if (!module) {
      return {
        success: false,
        error: { status: 404, message: 'Module not found' },
      };
    }

    // Check authorization
    const access = await authorizationService.checkWriteAccess(auth, {
      type: 'course',
      id: module.course.id,
    });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بإعادة الترتيب' },
      };
    }

    // Verify all lesson IDs belong to this module
    const lessons = await prisma.lesson.findMany({
      where: { moduleId },
      select: { id: true },
    });
    const moduleLessonIds = new Set(lessons.map((l) => l.id));
    const invalidIds = lessonIds.filter((id) => !moduleLessonIds.has(id));

    if (invalidIds.length > 0) {
      return {
        success: false,
        error: { status: 400, message: 'بعض الدروس لا تنتمي لهذه الوحدة' },
      };
    }

    await lessonRepository.reorder(moduleId, lessonIds);
    return { success: true };
  }
}

/**
 * Singleton instance
 */
export const lessonManager = new LessonManager();
