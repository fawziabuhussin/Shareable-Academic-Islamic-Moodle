/**
 * Enrollment-specific types and DTOs
 */

/** Admin list filters for paginated enrollment queries */
export interface AdminEnrollmentListFilters {
  search?: string;
  userId?: string;
  courseId?: string;
  status?: string;
}

/**
 * DTO for creating a new enrollment
 */
export interface CreateEnrollmentDTO {
  courseId: string;
  userId: string;
  status?: string;
}

/**
 * DTO for updating an existing enrollment
 */
export interface UpdateEnrollmentDTO {
  status?: string;
}

/**
 * Enrollment with relations (includes related data)
 */
export interface EnrollmentWithRelations {
  id: string;
  userId: string;
  courseId: string;
  status: string;
  enrolledAt: Date;
  updatedAt: Date;
  finalScore?: number | null;
  overrideScore?: number | null;
  finalizedAt?: Date | null;
  finalizedById?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  course?: {
    id: string;
    title: string;
    description: string | null;
    coverImage: string | null;
    status: string;
    category?: {
      id: string;
      title: string;
    };
    teacher?: {
      id: string;
      name: string;
    };
    modules?: Array<{
      id: string;
      title: string;
      order: number;
      lessons?: Array<{
        id: string;
        title: string;
        order: number;
      }>;
    }>;
  };
}
