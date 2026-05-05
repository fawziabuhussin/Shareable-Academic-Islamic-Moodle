/**
 * Question Repository - Data access layer for LessonQuestion model
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { QuestionFilters } from '../types/question.types';
import { PaginationParams, PaginatedResponse } from '../types/common.types';

// Include relations for detailed question data
const questionInclude = {
  student: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  course: {
    select: {
      id: true,
      title: true,
      teacherId: true,
    },
  },
  lesson: {
    select: {
      id: true,
      title: true,
      order: true,
      module: {
        select: {
          id: true,
          title: true,
          order: true,
        },
      },
    },
  },
  answeredBy: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export const questionRepository = {
  /**
   * Create a new question
   */
  async create(data: {
    studentId: string;
    courseId: string;
    lessonId: string;
    question: string;
  }) {
    return prisma.lessonQuestion.create({
      data: {
        studentId: data.studentId,
        courseId: data.courseId,
        lessonId: data.lessonId,
        question: data.question,
        status: 'PENDING',
      },
      include: questionInclude,
    });
  },

  /**
   * Find question by ID with relations
   */
  async findById(id: string) {
    return prisma.lessonQuestion.findUnique({
      where: { id },
      include: questionInclude,
    });
  },

  /**
   * Find all questions with optional filters and pagination
   */
  async findAll(filters: QuestionFilters = {}, pagination?: PaginationParams): Promise<PaginatedResponse<any>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.LessonQuestionWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.courseId) {
      where.courseId = filters.courseId;
    }
    if (filters.lessonId) {
      where.lessonId = filters.lessonId;
    }

    const [total, data] = await Promise.all([
      prisma.lessonQuestion.count({ where }),
      prisma.lessonQuestion.findMany({
        where,
        include: questionInclude,
        orderBy: { createdAt: 'desc' },
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
  },

  /**
   * Find all questions without pagination (backward compatible)
   */
  async findAllUnpaginated(filters: QuestionFilters = {}) {
    const where: Prisma.LessonQuestionWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.courseId) {
      where.courseId = filters.courseId;
    }
    if (filters.lessonId) {
      where.lessonId = filters.lessonId;
    }

    return prisma.lessonQuestion.findMany({
      where,
      include: questionInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Find questions by student ID with pagination
   */
  async findByStudent(studentId: string, pagination?: PaginationParams): Promise<PaginatedResponse<any>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      prisma.lessonQuestion.count({ where: { studentId } }),
      prisma.lessonQuestion.findMany({
        where: { studentId },
        include: questionInclude,
        orderBy: { createdAt: 'desc' },
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
  },

  /**
   * Find questions by student ID without pagination (backward compatible)
   */
  async findByStudentUnpaginated(studentId: string) {
    return prisma.lessonQuestion.findMany({
      where: { studentId },
      include: questionInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Find questions for courses taught by a specific teacher with pagination
   */
  async findByTeacher(teacherId: string, filters: QuestionFilters = {}, pagination?: PaginationParams): Promise<PaginatedResponse<any>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.LessonQuestionWhereInput = {
      course: {
        teacherId,
      },
    };

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.courseId) {
      where.courseId = filters.courseId;
    }

    const [total, data] = await Promise.all([
      prisma.lessonQuestion.count({ where }),
      prisma.lessonQuestion.findMany({
        where,
        include: questionInclude,
        orderBy: { createdAt: 'desc' },
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
  },

  /**
   * Find questions for courses taught by a specific teacher without pagination (backward compatible)
   */
  async findByTeacherUnpaginated(teacherId: string, filters: QuestionFilters = {}) {
    const where: Prisma.LessonQuestionWhereInput = {
      course: {
        teacherId,
      },
    };

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.courseId) {
      where.courseId = filters.courseId;
    }

    return prisma.lessonQuestion.findMany({
      where,
      include: questionInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Count new questions (for notifications)
   */
  async countNew(teacherId?: string) {
    const where: Prisma.LessonQuestionWhereInput = {
      status: 'PENDING',
    };

    if (teacherId) {
      where.course = { teacherId };
    }

    return prisma.lessonQuestion.count({ where });
  },

  /**
   * Answer a question
   */
  async answer(
    id: string,
    data: {
      answer: string;
      answeredById: string;
    }
  ) {
    return prisma.lessonQuestion.update({
      where: { id },
      data: {
        answer: data.answer,
        answeredById: data.answeredById,
        status: 'ANSWERED',
        answeredAt: new Date(),
      },
      include: questionInclude,
    });
  },

  /**
   * Delete a question
   */
  async delete(id: string) {
    return prisma.lessonQuestion.delete({
      where: { id },
    });
  },
};
