/**
 * Enrollment Repository
 * Data access layer for Enrollment-related database operations
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import {
  AdminEnrollmentListFilters,
  EnrollmentWithRelations,
  CreateEnrollmentDTO,
  UpdateEnrollmentDTO,
} from '../types/enrollment.types';
import { PaginationParams, PaginatedResponse } from '../types/common.types';

export type AdminEnrollmentListResult = PaginatedResponse<EnrollmentWithRelations> & {
  stats: { active: number; pending: number; canceled: number };
};

function buildAdminEnrollmentWhere(filters?: AdminEnrollmentListFilters): Prisma.EnrollmentWhereInput {
  const clauses: Prisma.EnrollmentWhereInput[] = [];
  if (filters?.userId?.trim()) {
    clauses.push({ userId: filters.userId.trim() });
  }
  if (filters?.courseId?.trim()) {
    clauses.push({ courseId: filters.courseId.trim() });
  }
  if (filters?.status?.trim()) {
    clauses.push({ status: filters.status.trim() });
  }
  const q = filters?.search?.trim();
  if (q) {
    clauses.push({
      OR: [
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { course: { title: { contains: q, mode: 'insensitive' } } },
      ],
    });
  }
  return clauses.length > 0 ? { AND: clauses } : {};
}

/**
 * Include configuration for fetching enrollments with full course details
 */
const enrollmentWithCourseInclude = {
  course: {
    include: {
      category: true,
      teacher: {
        select: { id: true, name: true },
      },
      modules: {
        include: {
          lessons: true,
        },
      },
    },
  },
};

/**
 * Build include config with lesson progress filtered by userId
 */
const getEnrollmentWithProgressInclude = (userId: string) => ({
  course: {
    include: {
      category: true,
      teacher: {
        select: { id: true, name: true },
      },
      modules: {
        include: {
          lessons: {
            include: {
              progress: {
                where: { userId },
                select: { id: true, completedAt: true },
              },
            },
          },
        },
      },
    },
  },
});

/**
 * Include configuration for fetching enrollments with user details
 */
const enrollmentWithUserInclude = {
  user: {
    select: { id: true, name: true, email: true },
  },
};

export class EnrollmentRepository {
  /**
   * Find all enrollments with pagination (admin view)
   */
  async findAll(
    pagination?: PaginationParams,
    filters?: AdminEnrollmentListFilters
  ): Promise<AdminEnrollmentListResult> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;
    const where = buildAdminEnrollmentWhere(filters);

    const [total, data, statusGroups] = await Promise.all([
      prisma.enrollment.count({ where }),
      prisma.enrollment.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, title: true } },
        },
        orderBy: { enrolledAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.enrollment.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
    ]);

    const byStatus = Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all])) as Record<
      string,
      number
    >;

    return {
      data: data as EnrollmentWithRelations[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        active: byStatus.ACTIVE ?? 0,
        pending: byStatus.PENDING ?? 0,
        canceled: byStatus.CANCELED ?? 0,
      },
    };
  }

  /**
   * Find all enrollments without pagination (admin view - backward compatible)
   */
  async findAllUnpaginated(): Promise<EnrollmentWithRelations[]> {
    return prisma.enrollment.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    }) as Promise<EnrollmentWithRelations[]>;
  }

  /**
   * Find all enrollments for a user with pagination (includes lesson progress for progress calculation)
   */
  async findByUserId(
    userId: string,
    status?: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<EnrollmentWithRelations>> {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    // Pagination defaults
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    // Execute count and data queries in parallel
    const [total, data] = await Promise.all([
      prisma.enrollment.count({ where }),
      prisma.enrollment.findMany({
        where,
        include: getEnrollmentWithProgressInclude(userId),
        orderBy: { enrolledAt: 'desc' },
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
   * Find all enrollments for a user without pagination (for backward compatibility)
   */
  async findByUserIdUnpaginated(userId: string, status?: string): Promise<EnrollmentWithRelations[]> {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    return prisma.enrollment.findMany({
      where,
      include: getEnrollmentWithProgressInclude(userId),
      orderBy: { enrolledAt: 'desc' },
    });
  }

  /**
   * Find all enrollments for a course
   */
  async findByCourseId(courseId: string): Promise<EnrollmentWithRelations[]> {
    return prisma.enrollment.findMany({
      where: { courseId },
      include: enrollmentWithUserInclude,
      orderBy: { enrolledAt: 'desc' },
    });
  }

  /**
   * Find a single enrollment by ID
   */
  async findById(id: string): Promise<EnrollmentWithRelations | null> {
    return prisma.enrollment.findUnique({
      where: { id },
      include: {
        ...enrollmentWithCourseInclude,
        ...enrollmentWithUserInclude,
      },
    });
  }

  /**
   * Find enrollment by user and course
   */
  async findByUserAndCourse(userId: string, courseId: string): Promise<EnrollmentWithRelations | null> {
    return prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      include: enrollmentWithCourseInclude,
    });
  }

  /**
   * Create a new enrollment
   */
  async create(data: CreateEnrollmentDTO): Promise<EnrollmentWithRelations> {
    return prisma.enrollment.create({
      data: {
        userId: data.userId,
        courseId: data.courseId,
        status: data.status || 'ACTIVE',
      },
      include: enrollmentWithCourseInclude,
    });
  }

  /**
   * Update an existing enrollment
   */
  async update(id: string, data: UpdateEnrollmentDTO): Promise<EnrollmentWithRelations> {
    return prisma.enrollment.update({
      where: { id },
      data,
      include: enrollmentWithCourseInclude,
    });
  }

  /**
   * Delete an enrollment
   */
  async delete(id: string): Promise<void> {
    await prisma.enrollment.delete({ where: { id } });
  }

  /**
   * Check if enrollment exists
   */
  async exists(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      select: { id: true },
    });
    return !!enrollment;
  }

  /**
   * Finalize a student's grade for a course enrollment
   */
  async finalizeStudentGrade(
    enrollmentId: string,
    finalScore: number,
    finalizedById: string
  ): Promise<void> {
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        finalScore,
        finalizedAt: new Date(),
        finalizedById,
      },
    });
  }

  /**
   * Set a teacher override score for a student's enrollment
   */
  async setStudentGradeOverride(
    enrollmentId: string,
    overrideScore: number
  ): Promise<void> {
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { overrideScore },
    });
  }

  /**
   * Add a final grade for a student who has no grade yet.
   * Sets overrideScore, finalScore, finalizedAt, and finalizedById in one atomic update.
   */
  async addStudentGrade(
    enrollmentId: string,
    score: number,
    finalizedById: string
  ): Promise<void> {
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        overrideScore: score,
        finalScore: score,
        finalizedAt: new Date(),
        finalizedById,
      },
    });
  }

  /**
   * Clear grade finalization (reopen for changes)
   */
  async clearStudentGradeFinalization(enrollmentId: string): Promise<void> {
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        finalScore: null,
        overrideScore: null,
        finalizedAt: null,
        finalizedById: null,
      },
    });
  }

  /**
   * Find finalized grades for a user across multiple courses (for prerequisite checks)
   */
  async findFinalizedGradesByUserAndCourses(
    userId: string,
    courseIds: string[]
  ): Promise<Array<{ courseId: string; finalScore: number | null; overrideScore: number | null }>> {
    return prisma.enrollment.findMany({
      where: {
        userId,
        courseId: { in: courseIds },
        finalizedAt: { not: null },
      },
      select: {
        courseId: true,
        finalScore: true,
        overrideScore: true,
      },
    });
  }
}

/**
 * Singleton instance
 */
export const enrollmentRepository = new EnrollmentRepository();
