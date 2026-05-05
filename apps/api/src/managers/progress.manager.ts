/**
 * Progress Manager
 * Business logic layer for lesson progress management
 */
import { progressRepository } from '../repositories/progress.repository';
import { AuthContext } from '../types/common.types';
import {
  LessonProgressWithRelations,
  LessonStatusResponse,
  CourseProgressResponse,
} from '../types/progress.types';

/**
 * Result types for manager operations
 */
export interface ProgressResult {
  success: boolean;
  data?: LessonProgressWithRelations;
  error?: { status: number; message: string };
}

export interface LessonStatusResult {
  success: boolean;
  data?: LessonStatusResponse;
  error?: { status: number; message: string };
}

export interface CourseProgressResult {
  success: boolean;
  data?: CourseProgressResponse;
  error?: { status: number; message: string };
}

export class ProgressManager {
  /**
   * Mark lesson as completed
   */
  async completeLesson(auth: AuthContext, lessonId: string): Promise<ProgressResult> {
    // Check if lesson exists and get course info
    const lesson = await progressRepository.getLessonWithCourse(lessonId);

    if (!lesson) {
      return {
        success: false,
        error: { status: 404, message: 'Lesson not found' },
      };
    }

    // Check enrollment (admins bypass this check)
    if (auth.role !== 'ADMIN') {
      const isEnrolled = lesson.module.course.enrollments.some(
        (enrollment) => enrollment.userId === auth.userId
      );

      if (!isEnrolled) {
        return {
          success: false,
          error: { status: 403, message: 'You must be enrolled in this course' },
        };
      }
    }

    // Upsert progress
    const progress = await progressRepository.upsertProgress(auth.userId, lessonId);

    return { success: true, data: progress };
  }

  /**
   * Check if a lesson is completed
   */
  async getLessonStatus(auth: AuthContext, lessonId: string): Promise<LessonStatusResult> {
    // Check if lesson exists and get course info
    const lesson = await progressRepository.getLessonWithCourse(lessonId);

    if (!lesson) {
      return {
        success: false,
        error: { status: 404, message: 'Lesson not found' },
      };
    }

    // Check enrollment (admins bypass this check)
    if (auth.role !== 'ADMIN') {
      const isEnrolled = lesson.module.course.enrollments.some(
        (enrollment) => enrollment.userId === auth.userId
      );

      if (!isEnrolled) {
        return {
          success: false,
          error: { status: 403, message: 'You must be enrolled in this course' },
        };
      }
    }

    // Check if lesson is completed
    const progress = await progressRepository.findByUserAndLesson(auth.userId, lessonId);

    return {
      success: true,
      data: {
        completed: !!progress,
        completedAt: progress?.completedAt || null,
      },
    };
  }

  /**
   * Get progress for a course
   */
  async getCourseProgress(auth: AuthContext, courseId: string): Promise<CourseProgressResult> {
    // Get course with all lessons
    const course = await progressRepository.getCourseWithLessons(courseId);

    if (!course) {
      return {
        success: false,
        error: { status: 404, message: 'Course not found' },
      };
    }

    // Check enrollment (admins bypass this check)
    if (auth.role !== 'ADMIN') {
      const isEnrolled = course.enrollments.some(
        (enrollment) => enrollment.userId === auth.userId
      );

      if (!isEnrolled) {
        return {
          success: false,
          error: { status: 403, message: 'You must be enrolled in this course' },
        };
      }
    }

    // Get all lesson IDs
    const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));

    // Get all progress
    const progress = await progressRepository.findByUserAndLessons(auth.userId, lessonIds);

    const progressMap = new Map(progress.map((p) => [p.lessonId, p]));

    // Calculate stats
    const totalLessons = lessonIds.length;
    const completedLessons = progress.length;
    const percentage =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Convert Map to object for JSON serialization
    const progressObject: Record<string, any> = {};
    progressMap.forEach((value, key) => {
      progressObject[key] = {
        lessonId: value.lessonId,
        completedAt: value.completedAt,
      };
    });

    return {
      success: true,
      data: {
        courseId,
        totalLessons,
        completedLessons,
        percentage,
        progress: progressObject,
        completedLessonIds: Array.from(progressMap.keys()),
      },
    };
  }
}

/**
 * Singleton instance
 */
export const progressManager = new ProgressManager();
