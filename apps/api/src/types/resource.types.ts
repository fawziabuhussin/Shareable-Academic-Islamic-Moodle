/**
 * Resource-specific types and DTOs (Data Transfer Objects)
 */

/**
 * DTO for creating a new resource
 */
export interface CreateResourceDTO {
  title: string;
  description?: string;
  url: string;
}

/**
 * DTO for updating an existing resource
 */
export interface UpdateResourceDTO {
  title?: string;
  description?: string | null;
  url?: string;
}

/**
 * Resource with creator information (includes relations)
 */
export interface ResourceWithCreator {
  id: string;
  title: string;
  description: string | null;
  url: string;
  order: number;
  courseId: string | null;
  lessonId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string;
  };
}
