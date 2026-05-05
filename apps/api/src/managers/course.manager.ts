/**
 * Course Manager
 * Business logic layer for course management
 */
import { courseRepository } from '../repositories/course.repository';
import { enrollmentRepository } from '../repositories/enrollment.repository';
import { AuthContext, PaginationParams, PaginatedResponse } from '../types/common.types';
import { CreateCourseDTO, UpdateCourseDTO, CourseWithRelations, CourseListFilters } from '../types/course.types';
import { prisma } from '../utils/prisma';
import { getEffectiveEnrollmentScore } from '../utils/grading';

/**
 * Result types for manager operations
 */
export interface CourseListResult {
  success: boolean;
  data?: CourseWithRelations[];
  error?: { status: number; message: string };
}

export interface CoursePaginatedResult {
  success: boolean;
  data?: PaginatedResponse<CourseWithRelations>;
  error?: { status: number; message: string };
}

export interface CourseResult {
  success: boolean;
  data?: CourseWithRelations;
  error?: { status: number; message: string };
}

export interface DeleteResult {
  success: boolean;
  error?: { status: number; message: string };
}

export class CourseManager {
  /**
   * List all courses with filters and pagination
   * Access rules:
   * - Public/unauthenticated: only PUBLISHED courses
   * - STUDENT: only PUBLISHED courses
   * - TEACHER: their own courses (all statuses)
   * - ADMIN: all courses
   */
  async listCourses(
    auth: AuthContext | null,
    filters: CourseListFilters,
    pagination?: PaginationParams
  ): Promise<CoursePaginatedResult> {
    const appliedFilters = { ...filters };

    // Apply status filter based on role
    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'TEACHER')) {
      appliedFilters.status = 'PUBLISHED';
    }

    // Teachers see only their own courses unless they're also viewing published ones
    if (auth && auth.role === 'TEACHER' && !filters.teacherId) {
      appliedFilters.teacherId = auth.userId;
    }

    const result = await courseRepository.findAll(appliedFilters, pagination);
    return { success: true, data: result };
  }

  /**
   * Get admin/teacher course list (includes DRAFT courses)
   */
  async listAdminCourses(
    auth: AuthContext,
    filters: CourseListFilters,
    pagination?: PaginationParams
  ): Promise<CoursePaginatedResult> {
    // Check authorization
    if (auth.role !== 'TEACHER' && auth.role !== 'ADMIN') {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول' },
      };
    }

    const appliedFilters: CourseListFilters = { ...filters };
    
    // Teachers can only see their own courses
    if (auth.role === 'TEACHER') {
      appliedFilters.teacherId = auth.userId;
    }

    const result = await courseRepository.findAll(appliedFilters, pagination);
    return { success: true, data: result };
  }

  /**
   * Get admin/teacher course list without pagination (for backward compatibility)
   */
  async listAdminCoursesUnpaginated(auth: AuthContext): Promise<CourseListResult> {
    // Check authorization
    if (auth.role !== 'TEACHER' && auth.role !== 'ADMIN') {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول' },
      };
    }

    const filters: CourseListFilters = {};
    
    // Teachers can only see their own courses
    if (auth.role === 'TEACHER') {
      filters.teacherId = auth.userId;
    }

    const courses = await courseRepository.findAllUnpaginated(filters);
    return { success: true, data: courses };
  }

  /**
   * Get a single course by ID
   * Access rules:
   * - PUBLISHED courses: accessible by everyone
   * - DRAFT courses: accessible only by teacher, admin, or enrolled students
   */
  async getCourse(auth: AuthContext | null, courseId: string): Promise<CourseResult> {
    const course = await courseRepository.findByIdWithRelations(courseId, auth?.userId);

    if (!course) {
      return {
        success: false,
        error: { status: 404, message: 'Course not found' },
      };
    }

    // Check access based on course status
    if (course.status !== 'PUBLISHED') {
      // For draft courses, check if user has access
      if (!auth) {
        return {
          success: false,
          error: { status: 403, message: 'Course not accessible' },
        };
      }

      const isTeacher = course.teacherId === auth.userId;
      const isAdmin = auth.role === 'ADMIN';
      const isEnrolled = course.enrollments && course.enrollments.length > 0;

      if (!isTeacher && !isAdmin && !isEnrolled) {
        return {
          success: false,
          error: { status: 403, message: 'Course not accessible' },
        };
      }
    }

    // Enrich prerequisites with user's completion status
    if (auth && course.prerequisites && course.prerequisites.length > 0) {
      const prerequisiteIds = course.prerequisites.map((p: any) => p.prerequisite.id);
      
      // Get user's finalized enrollments for prerequisite courses (to check if passed)
      const finalizedEnrollments = await enrollmentRepository.findFinalizedGradesByUserAndCourses(
        auth.userId,
        prerequisiteIds
      );

      // Get user's enrollments for prerequisite courses
      const userEnrollments = await prisma.enrollment.findMany({
        where: {
          userId: auth.userId,
          courseId: { in: prerequisiteIds },
        },
        select: {
          courseId: true,
          status: true,
        },
      });

      // Check if passed (effective score >= 60%)
      const passedCourses = new Set<string>();
      for (const enrollment of finalizedEnrollments) {
        const score = getEffectiveEnrollmentScore(enrollment.finalScore, enrollment.overrideScore);
        if (score !== null && score >= 60) {
          passedCourses.add(enrollment.courseId);
        }
      }

      const enrollmentMap = new Map(userEnrollments.map((e: { courseId: string; status: string }) => [e.courseId, e.status]));

      // Enrich prerequisites with status
      (course as any).prerequisites = course.prerequisites.map((p: any) => {
        const prereqId = p.prerequisite.id;
        const enrollmentStatus = enrollmentMap.get(prereqId);
        const isPassed = passedCourses.has(prereqId);
        
        let status: 'not_enrolled' | 'enrolled' | 'completed' = 'not_enrolled';
        if (isPassed) {
          status = 'completed';
        } else if (enrollmentStatus === 'ACTIVE') {
          status = 'enrolled';
        }

        return {
          ...p,
          status,
          isCompleted: isPassed,
        };
      });
    }

    return { success: true, data: course };
  }

  /**
   * Create a new course (Teacher or Admin)
   */
  async createCourse(auth: AuthContext, data: Omit<CreateCourseDTO, 'teacherId'> & { teacherId?: string }): Promise<CourseResult> {
    // Check authorization
    if (auth.role !== 'TEACHER' && auth.role !== 'ADMIN') {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالإضافة' },
      };
    }

    // Determine teacherId
    // Admin can specify a teacherId, otherwise use their own
    const teacherId = auth.role === 'ADMIN' && data.teacherId
      ? data.teacherId
      : auth.userId;

    let prerequisiteCourseIds = data.prerequisiteCourseIds;
    if (prerequisiteCourseIds) {
      prerequisiteCourseIds = Array.from(new Set(prerequisiteCourseIds));
      if (prerequisiteCourseIds.length > 0) {
        const existing = await prisma.course.findMany({
          where: { id: { in: prerequisiteCourseIds } },
          select: { id: true },
        });
        if (existing.length !== prerequisiteCourseIds.length) {
          return {
            success: false,
            error: { status: 400, message: 'بعض المساقات السابقة غير موجودة' },
          };
        }
      }
    }

    const courseData: CreateCourseDTO = {
      ...data,
      teacherId,
      prerequisiteCourseIds,
    };

    const course = await courseRepository.create(courseData);
    return { success: true, data: course };
  }

  /**
   * Update an existing course (Teacher of course or Admin)
   */
  async updateCourse(
    auth: AuthContext,
    courseId: string,
    data: UpdateCourseDTO
  ): Promise<CourseResult> {
    // Check if course exists
    const course = await courseRepository.findById(courseId);
    if (!course) {
      return {
        success: false,
        error: { status: 404, message: 'Course not found' },
      };
    }

    // Check permissions
    const isTeacher = course.teacherId === auth.userId;
    const isAdmin = auth.role === 'ADMIN';
    if (!isTeacher && !isAdmin) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالتعديل' },
      };
    }

    // Only admins can change the teacher
    if (data.teacherId !== undefined) {
      if (!isAdmin) {
        return {
          success: false,
          error: { status: 403, message: 'فقط المشرف يمكنه تغيير المدرس' },
        };
      }

      // Validate that the target user exists and has role TEACHER or ADMIN
      const targetUser = await prisma.user.findUnique({
        where: { id: data.teacherId },
        select: { id: true, role: true },
      });
      if (!targetUser || (targetUser.role !== 'TEACHER' && targetUser.role !== 'ADMIN')) {
        return {
          success: false,
          error: { status: 400, message: 'المستخدم المحدد غير موجود أو ليس مدرساً' },
        };
      }
    }

    if (data.prerequisiteCourseIds) {
      const uniquePrereqs = Array.from(new Set(data.prerequisiteCourseIds)).filter(
        (id) => id !== courseId
      );

      if (uniquePrereqs.length > 0) {
        const existing = await prisma.course.findMany({
          where: { id: { in: uniquePrereqs } },
          select: { id: true },
        });
        if (existing.length !== uniquePrereqs.length) {
          return {
            success: false,
            error: { status: 400, message: 'بعض المساقات السابقة غير موجودة' },
          };
        }
      }

      data.prerequisiteCourseIds = uniquePrereqs;
    }

    const updated = await courseRepository.update(courseId, data);
    return { success: true, data: updated };
  }

  /**
   * Delete a course (Teacher of course or Admin)
   */
  async deleteCourse(auth: AuthContext, courseId: string): Promise<DeleteResult> {
    // Check if course exists
    const course = await courseRepository.findById(courseId);
    if (!course) {
      return {
        success: false,
        error: { status: 404, message: 'Course not found' },
      };
    }

    // Check permissions
    const isTeacher = course.teacherId === auth.userId;
    const isAdmin = auth.role === 'ADMIN';
    if (!isTeacher && !isAdmin) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالحذف' },
      };
    }

    await courseRepository.delete(courseId);
    return { success: true };
  }

  /**
   * Get my courses (Teacher)
   */
  async getMyCourses(auth: AuthContext): Promise<CourseListResult> {
    // Check authorization
    if (auth.role !== 'TEACHER' && auth.role !== 'ADMIN') {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول' },
      };
    }

    const courses = await courseRepository.findAllUnpaginated({ teacherId: auth.userId });
    return { success: true, data: courses };
  }

  /**
   * List all courses without pagination (for backward compatibility)
   */
  async listCoursesUnpaginated(
    auth: AuthContext | null,
    filters: CourseListFilters
  ): Promise<CourseListResult> {
    const appliedFilters = { ...filters };

    // Apply status filter based on role
    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'TEACHER')) {
      appliedFilters.status = 'PUBLISHED';
    }

    // Teachers see only their own courses unless they're also viewing published ones
    if (auth && auth.role === 'TEACHER' && !filters.teacherId) {
      appliedFilters.teacherId = auth.userId;
    }

    const courses = await courseRepository.findAllUnpaginated(appliedFilters);
    return { success: true, data: courses };
  }
}

/**
 * Singleton instance
 */
export const courseManager = new CourseManager();
