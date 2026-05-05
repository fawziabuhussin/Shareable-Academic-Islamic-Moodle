/**
 * Progress Repository
 * Data access layer for LessonProgress-related database operations
 */
import { prisma } from '../utils/prisma';
import { LessonProgressWithRelations } from '../types/progress.types';

export class ProgressRepository {
  /**
   * Find progress for a specific user and lesson
   */
  async findByUserAndLesson(userId: string, lessonId: string): Promise<LessonProgressWithRelations | null> {
    return prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
    });
  }

  /**
   * Mark lesson as complete (upsert)
   */
  async upsertProgress(userId: string, lessonId: string): Promise<LessonProgressWithRelations> {
    return prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      update: {
        completedAt: new Date(),
      },
      create: {
        userId,
        lessonId,
      },
    });
  }

  /**
   * Find all progress for a user in specific lessons
   */
  async findByUserAndLessons(userId: string, lessonIds: string[]): Promise<LessonProgressWithRelations[]> {
    return prisma.lessonProgress.findMany({
      where: {
        userId,
        lessonId: { in: lessonIds },
      },
    });
  }

  /**
   * Get lesson with course information for authorization
   */
  async getLessonWithCourse(lessonId: string) {
    return prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              include: {
                enrollments: {
                  where: {
                    status: 'ACTIVE',
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get course with modules and lessons
   */
  async getCourseWithLessons(courseId: string) {
    return prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: true,
          },
        },
        enrollments: {
          where: {
            status: 'ACTIVE',
          },
        },
      },
    });
  }
}

/**
 * Singleton instance
 */
export const progressRepository = new ProgressRepository();
