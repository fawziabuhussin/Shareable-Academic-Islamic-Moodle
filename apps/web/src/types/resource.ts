// apps/web/src/types/resource.ts

/**
 * Resource entity representing an external link attached to a course or lesson.
 * Resources are external URLs (Google Drive, YouTube supplementary materials, etc.)
 */
export interface Resource {
  id: string;
  title: string;
  description: string | null;
  url: string;
  order: number;
  courseId: string | null;
  lessonId: string | null;
  createdById: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  createdBy: {
    id: string;
    name: string;
  };
}

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
