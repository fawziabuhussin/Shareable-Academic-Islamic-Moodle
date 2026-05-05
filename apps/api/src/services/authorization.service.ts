/**
 * Authorization Service
 * Reusable authorization logic for access control across entities
 */
import { courseRepository } from '../repositories/course.repository';
import { ParentInfo, AuthContext, AccessCheckResult } from '../types/common.types';

export class AuthorizationService {
  /**
   * Get the course associated with a parent (course or lesson)
   * This is used to check permissions based on course ownership
   * 
   * @param parent - Parent information (course or lesson)
   * @returns Course with id and teacherId, or null if not found
   */
  async getCourseFromParent(parent: ParentInfo) {
    if (parent.type === 'course') {
      return courseRepository.findById(parent.id);
    }
    return courseRepository.findByLessonId(parent.id);
  }

  /**
   * Check if user has read access to resources
   * Read access rules:
   * - Admin: has access to everything
   * - Course Teacher: has access to their course resources
   * - Enrolled Student: has access if actively enrolled in the course
   * 
   * @param auth - Authentication context (userId and role)
   * @param parent - Parent information (course or lesson)
   * @returns Access check result with allowed flag and optional courseId
   */
  async checkReadAccess(auth: AuthContext, parent: ParentInfo): Promise<AccessCheckResult> {
    // Admin has access to everything
    if (auth.role === 'ADMIN') {
      const course = await this.getCourseFromParent(parent);
      return { allowed: true, courseId: course?.id };
    }

    const course = await this.getCourseFromParent(parent);
    if (!course) {
      return { allowed: false };
    }

    // Course teacher has access
    if (course.teacherId === auth.userId) {
      return { allowed: true, courseId: course.id };
    }

    // Check if user is enrolled in the course
    const isEnrolled = await courseRepository.isUserEnrolled(auth.userId, course.id);
    return { allowed: isEnrolled, courseId: course.id };
  }

  /**
   * Check if user has write access to resources
   * Write access rules:
   * - Admin: has access to everything
   * - Course Teacher: has access to their course resources only
   * - Students: no write access
   * 
   * @param auth - Authentication context (userId and role)
   * @param parent - Parent information (course or lesson)
   * @returns Access check result with allowed flag and optional courseId
   */
  async checkWriteAccess(auth: AuthContext, parent: ParentInfo): Promise<AccessCheckResult> {
    // Admin has access to everything
    if (auth.role === 'ADMIN') {
      const course = await this.getCourseFromParent(parent);
      return { allowed: true, courseId: course?.id };
    }

    const course = await this.getCourseFromParent(parent);
    if (!course) {
      return { allowed: false };
    }

    // Only course teacher has write access (besides admin)
    return { allowed: course.teacherId === auth.userId, courseId: course.id };
  }
}

/**
 * Singleton instance of AuthorizationService
 */
export const authorizationService = new AuthorizationService();
