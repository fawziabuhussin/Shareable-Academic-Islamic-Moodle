/**
 * Course Repository
 * Data access layer for Course-related database operations
 */
import { prisma } from '../utils/prisma';
import { CourseWithRelations, CreateCourseDTO, UpdateCourseDTO, CourseListFilters } from '../types/course.types';
import { PaginationParams, PaginatedResponse } from '../types/common.types';

/**
 * Include configuration for fetching courses with full relations
 */
const courseFullInclude = {
  category: true,
  teacher: {
    select: { id: true, name: true, email: true },
  },
  modules: {
    include: {
      lessons: {
        include: {
          resources: {
            orderBy: { order: 'asc' as const },
            include: {
              createdBy: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { order: 'asc' as const },
      },
    },
    orderBy: { order: 'asc' as const },
  },
  exams: {
    orderBy: { startDate: 'asc' as const },
  },
  homeworks: {
    orderBy: { dueDate: 'asc' as const },
  },
  resources: {
    orderBy: { order: 'asc' as const },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
  },
  prerequisites: {
    include: {
      prerequisite: {
        select: { id: true, title: true },
      },
    },
  },
  _count: {
    select: { enrollments: true },
  },
};

/**
 * Include configuration for fetching courses with basic relations
 */
const courseBasicInclude = {
  category: true,
  teacher: {
    select: { id: true, name: true, email: true },
  },
  modules: {
    include: {
      lessons: {
        select: { id: true },
      },
    },
  },
  _count: {
    select: { enrollments: true },
  },
  prerequisites: {
    include: {
      prerequisite: {
        select: { id: true, title: true },
      },
    },
  },
};

export class CourseRepository {
  /**
   * Find a course by ID (for authorization checks)
   * @param id - Course ID
   * @returns Course with id and teacherId, or null if not found
   */
  async findById(id: string) {
    return prisma.course.findUnique({
      where: { id },
      select: { id: true, teacherId: true },
    });
  }

  /**
   * Find a course by ID with full relations
   */
  async findByIdWithRelations(id: string, userId?: string): Promise<CourseWithRelations | null> {
    const include: any = { ...courseFullInclude };
    
    // Include enrollments for the specific user if provided
    if (userId) {
      include.enrollments = {
        where: { userId },
      };
    }

    return prisma.course.findUnique({
      where: { id },
      include,
    }) as Promise<CourseWithRelations | null>;
  }

  /**
   * Find all courses with filters (supports pagination)
   */
  async findAll(
    filters: CourseListFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<CourseWithRelations>> {
    const where: any = {};

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.teacherId) {
      where.teacherId = filters.teacherId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy based on sortBy/sortOrder
    const sortOrder = filters.sortOrder || 'desc';
    let orderBy: any = { createdAt: sortOrder };

    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'title':
          orderBy = { title: sortOrder };
          break;
        case 'category':
          orderBy = { category: { title: sortOrder } };
          break;
        case 'teacher':
          orderBy = { teacher: { name: sortOrder } };
          break;
        case 'status':
          orderBy = { status: sortOrder };
          break;
        case 'enrollments':
          orderBy = { enrollments: { _count: sortOrder } };
          break;
        case 'createdAt':
        default:
          orderBy = { createdAt: sortOrder };
          break;
      }
    }

    // Pagination defaults
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    // Execute count and data queries in parallel
    const [total, data] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        include: courseBasicInclude,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return {
      data: data as any,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find all courses without pagination (for backward compatibility)
   */
  async findAllUnpaginated(filters: CourseListFilters): Promise<CourseWithRelations[]> {
    const where: any = {};

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.teacherId) {
      where.teacherId = filters.teacherId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.course.findMany({
      where,
      include: courseBasicInclude,
      orderBy: { createdAt: 'desc' },
    }) as any;
  }

  /**
   * Create a new course
   */
  async create(data: CreateCourseDTO): Promise<CourseWithRelations> {
    const courseData: any = {
      title: data.title,
      description: data.description || null,
      categoryId: data.categoryId,
      teacherId: data.teacherId,
      price: data.price || 0,
      status: data.status || 'DRAFT',
      lifecycle: data.lifecycle || 'DEFAULT',
    };

    if (data.coverImage && data.coverImage.trim() !== '') {
      courseData.coverImage = data.coverImage;
    }

    if (data.readingWeight !== undefined) {
      courseData.readingWeight = data.readingWeight;
    }

    const prerequisiteIds = data.prerequisiteCourseIds ?? [];

    if (prerequisiteIds.length > 0) {
      return prisma.$transaction(async (tx) => {
        const created = await tx.course.create({
          data: courseData,
          include: courseBasicInclude,
        });

        // Dedupe prerequisite IDs to prevent duplicates
        const uniquePrereqIds = [...new Set(prerequisiteIds)];
        await tx.coursePrerequisite.createMany({
          data: uniquePrereqIds.map((prereqId) => ({
            courseId: created.id,
            prerequisiteCourseId: prereqId,
          })),
        });

        return created as any;
      });
    }

    return prisma.course.create({
      data: courseData,
      include: courseBasicInclude,
    }) as any;
  }

  /**
   * Update an existing course
   */
  async update(id: string, data: UpdateCourseDTO): Promise<CourseWithRelations> {
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description && data.description.trim() !== '' ? data.description : null;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.lifecycle !== undefined) updateData.lifecycle = data.lifecycle;
    if (data.readingWeight !== undefined) updateData.readingWeight = data.readingWeight;
    if (data.teacherId !== undefined) updateData.teacherId = data.teacherId;

    if (data.coverImage !== undefined) {
      updateData.coverImage = data.coverImage && data.coverImage.trim() !== '' ? data.coverImage : null;
    }

    if (data.prerequisiteCourseIds) {
      const prerequisiteIds = data.prerequisiteCourseIds ?? [];
      return prisma.$transaction(async (tx) => {
        const updated = await tx.course.update({
          where: { id },
          data: updateData,
          include: courseBasicInclude,
        });

        await tx.coursePrerequisite.deleteMany({ where: { courseId: id } });

        if (prerequisiteIds.length > 0) {
          // Dedupe prerequisite IDs (duplicates already removed by deleteMany above)
          const uniquePrereqIds = [...new Set(prerequisiteIds)];
          await tx.coursePrerequisite.createMany({
            data: uniquePrereqIds.map((prereqId) => ({
              courseId: id,
              prerequisiteCourseId: prereqId,
            })),
          });
        }

        return updated as any;
      });
    }

    return prisma.course.update({
      where: { id },
      data: updateData,
      include: courseBasicInclude,
    }) as any;
  }

  /**
   * Delete a course
   */
  async delete(id: string): Promise<void> {
    await prisma.course.delete({ where: { id } });
  }

  /**
   * Find the course associated with a lesson
   * @param lessonId - Lesson ID
   * @returns Course with id and teacherId, or null if not found
   */
  async findByLessonId(lessonId: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              select: { id: true, teacherId: true },
            },
          },
        },
      },
    });
    return lesson?.module?.course || null;
  }

  /**
   * Check if a user is enrolled in a course
   * @param userId - User ID
   * @param courseId - Course ID
   * @returns true if user is enrolled with ACTIVE status
   */
  async isUserEnrolled(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId,
        status: 'ACTIVE',
      },
    });
    return !!enrollment;
  }

  /**
   * Check if course exists
   */
  async exists(id: string): Promise<boolean> {
    const course = await prisma.course.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!course;
  }
}

/**
 * Singleton instance of CourseRepository
 */
export const courseRepository = new CourseRepository();
