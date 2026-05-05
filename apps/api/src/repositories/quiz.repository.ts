/**
 * Quiz Repository
 * Data access layer for Quiz-related database operations
 */
import { prisma } from '../utils/prisma';
import { QuizWithRelations, QuizAttemptResult, SubmitQuizAttemptDTO } from '../types/quiz.types';

/**
 * Include configuration for fetching quizzes with relations
 */
const quizInclude = {
  questions: {
    orderBy: { order: 'asc' as const },
  },
  course: {
    select: { id: true, title: true },
  },
};

/**
 * Include configuration for quiz attempt with enrollment check
 */
const quizWithEnrollmentInclude = {
  questions: true,
  course: {
    include: {
      enrollments: {
        select: {
          userId: true,
          status: true,
        },
      },
    },
  },
};

export class QuizRepository {
  /**
   * Find all quizzes for a course
   */
  async findByCourseId(courseId: string): Promise<QuizWithRelations[]> {
    return prisma.quiz.findMany({
      where: { courseId },
      include: quizInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find a single quiz by ID
   */
  async findById(id: string): Promise<QuizWithRelations | null> {
    return prisma.quiz.findUnique({
      where: { id },
      include: quizInclude,
    });
  }

  /**
   * Find a quiz by ID with enrollment information
   */
  async findByIdWithEnrollment(quizId: string, userId: string) {
    return prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true,
        course: {
          include: {
            enrollments: {
              where: {
                userId,
                status: 'ACTIVE',
              },
            },
          },
        },
      },
    });
  }

  /**
   * Create a quiz attempt and return the result
   */
  async createAttempt(
    userId: string,
    quizId: string,
    score: number
  ): Promise<QuizAttemptResult> {
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        score,
      },
    });

    // Return with additional fields that will be added by manager
    return attempt as any;
  }

  /**
   * Check if quiz exists and belongs to course
   */
  async existsInCourse(id: string, courseId: string): Promise<boolean> {
    const quiz = await prisma.quiz.findFirst({
      where: { id, courseId },
    });
    return !!quiz;
  }
}

/**
 * Singleton instance
 */
export const quizRepository = new QuizRepository();
