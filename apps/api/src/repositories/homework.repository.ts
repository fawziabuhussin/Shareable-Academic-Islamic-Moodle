/**
 * Homework Repository
 * Data access layer for Homework-related database operations
 */
import { prisma } from '../utils/prisma';
import {
  HomeworkWithRelations,
  HomeworkSubmissionWithRelations,
  CreateHomeworkDTO,
  UpdateHomeworkDTO,
  SubmitHomeworkDTO,
  GradeHomeworkDTO,
} from '../types/homework.types';
import { PaginationParams, PaginatedResponse } from '../types/common.types';

/**
 * Include configuration for fetching homework with relations
 */
const homeworkInclude = {
  course: {
    select: {
      id: true,
      title: true,
      description: true,
      teacherId: true,
      teacher: {
        select: { id: true, name: true },
      },
      enrollments: {
        select: {
          userId: true,
          status: true,
        },
      },
    },
  },
  submissions: true,
  _count: { select: { submissions: true } },
};

/**
 * Include configuration for fetching homework submissions
 */
const submissionInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

export class HomeworkRepository {
  /**
   * Find all homework for a course with pagination
   */
  async findByCourseId(courseId: string, userId?: string, pagination?: PaginationParams): Promise<PaginatedResponse<HomeworkWithRelations>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const include: any = {
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          teacherId: true,
        },
      },
      _count: { select: { submissions: true } },
    };

    // Include user's submissions if userId is provided
    if (userId) {
      include.submissions = {
        where: { userId },
      };
    }

    const [total, data] = await Promise.all([
      prisma.homework.count({ where: { courseId } }),
      prisma.homework.findMany({
        where: { courseId },
        include,
        orderBy: { dueDate: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find all homework for a course without pagination (backward compatible)
   */
  async findByCourseIdUnpaginated(courseId: string, userId?: string): Promise<HomeworkWithRelations[]> {
    const include: any = {
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          teacherId: true,
        },
      },
      _count: { select: { submissions: true } },
    };

    // Include user's submissions if userId is provided
    if (userId) {
      include.submissions = {
        where: { userId },
      };
    }

    return prisma.homework.findMany({
      where: { courseId },
      include,
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Find a single homework by ID
   */
  async findById(id: string, userId?: string): Promise<HomeworkWithRelations | null> {
    const include: any = {
      course: {
        include: {
          enrollments: {
            select: {
              userId: true,
              status: true,
            },
          },
          teacher: {
            select: { id: true, name: true },
          },
        },
      },
    };

    // Include user's submissions if userId is provided
    if (userId) {
      include.submissions = {
        where: { userId },
      };
    }

    return prisma.homework.findUnique({
      where: { id },
      include,
    });
  }

  /**
   * Create a new homework
   */
  async create(data: CreateHomeworkDTO, courseId: string): Promise<HomeworkWithRelations> {
    const homeworkData: any = {
      courseId,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate instanceof Date ? data.dueDate : new Date(data.dueDate),
      maxScore: data.maxScore,
    };

    if (data.moduleId) homeworkData.moduleId = data.moduleId;
    if (data.lessonId) homeworkData.lessonId = data.lessonId;

    return prisma.homework.create({
      data: homeworkData,
      include: homeworkInclude,
    });
  }

  /**
   * Update an existing homework
   */
  async update(id: string, data: UpdateHomeworkDTO): Promise<HomeworkWithRelations> {
    const updateData: any = {};
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate instanceof Date ? data.dueDate : new Date(data.dueDate);
    }
    if (data.maxScore !== undefined) updateData.maxScore = data.maxScore;
    if (data.moduleId !== undefined) updateData.moduleId = data.moduleId;
    if (data.lessonId !== undefined) updateData.lessonId = data.lessonId;

    return prisma.homework.update({
      where: { id },
      data: updateData,
      include: homeworkInclude,
    });
  }

  /**
   * Delete a homework
   */
  async delete(id: string): Promise<void> {
    await prisma.homework.delete({ where: { id } });
  }

  /**
   * Check if homework exists and belongs to course
   */
  async existsInCourse(id: string, courseId: string): Promise<boolean> {
    const homework = await prisma.homework.findFirst({
      where: { id, courseId },
    });
    return !!homework;
  }

  /**
   * Submit homework
   */
  async submitHomework(
    homeworkId: string,
    userId: string,
    data: SubmitHomeworkDTO
  ): Promise<HomeworkSubmissionWithRelations> {
    return prisma.homeworkSubmission.create({
      data: {
        homeworkId,
        userId,
        content: data.content,
        fileUrl: data.attachments || undefined,
      },
      include: submissionInclude,
    });
  }

  /**
   * Check if user has already submitted homework
   */
  async hasSubmission(homeworkId: string, userId: string): Promise<boolean> {
    const submission = await prisma.homeworkSubmission.findUnique({
      where: {
        homeworkId_userId: {
          homeworkId,
          userId,
        },
      },
    });
    return !!submission;
  }

  /**
   * Get all submissions for a homework
   */
  async getSubmissions(homeworkId: string): Promise<HomeworkSubmissionWithRelations[]> {
    return prisma.homeworkSubmission.findMany({
      where: { homeworkId },
      include: submissionInclude,
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * Grade a homework submission
   */
  async gradeSubmission(
    submissionId: string,
    data: GradeHomeworkDTO
  ): Promise<HomeworkSubmissionWithRelations> {
    return prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: {
        score: data.score,
        feedback: data.feedback,
        gradedAt: new Date(),
      },
      include: submissionInclude,
    });
  }

  /**
   * Get submission by ID
   */
  async getSubmissionById(submissionId: string): Promise<HomeworkSubmissionWithRelations | null> {
    return prisma.homeworkSubmission.findUnique({
      where: { id: submissionId },
      include: submissionInclude,
    });
  }
}

/**
 * Singleton instance
 */
export const homeworkRepository = new HomeworkRepository();
