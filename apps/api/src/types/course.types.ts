/**
 * Course-specific types and DTOs
 */

/**
 * DTO for creating a new course
 */
export interface CreateCourseDTO {
  title: string;
  description?: string;
  coverImage?: string;
  categoryId: string;
  teacherId: string;
  price?: number;
  status?: string;
  lifecycle?: string;
  readingWeight?: number;
  prerequisiteCourseIds?: string[];
}

/**
 * DTO for updating an existing course
 */
export interface UpdateCourseDTO {
  title?: string;
  description?: string;
  coverImage?: string | null;
  categoryId?: string;
  price?: number;
  status?: string;
  lifecycle?: string;
  readingWeight?: number;
  teacherId?: string;
  prerequisiteCourseIds?: string[];
}

/**
 * Course with relations (includes related data)
 */
export interface CourseWithRelations {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  categoryId: string;
  teacherId: string;
  status: string;
  lifecycle: string;
  price: number | null;
  readingWeight: number;
  createdAt: Date;
  updatedAt: Date;
  category?: {
    id: string;
    title: string;
  };
  teacher?: {
    id: string;
    name: string;
    email: string;
  };
  modules?: Array<{
    id: string;
    title: string;
    order: number;
    lessons?: Array<{
      id: string;
      title: string;
      type: string;
      order: number;
      resources?: any[];
    }>;
  }>;
  enrollments?: Array<{
    id: string;
    userId: string;
    status: string;
  }>;
  exams?: any[];
  homeworks?: any[];
  resources?: any[];
  prerequisites?: Array<{
    prerequisite: {
      id: string;
      title: string;
    };
  }>;
  _count?: {
    enrollments: number;
  };
}

/**
 * Course list filters
 */
export interface CourseListFilters {
  categoryId?: string;
  search?: string;
  teacherId?: string;
  status?: string;
  sortBy?: 'title' | 'category' | 'teacher' | 'status' | 'enrollments' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
