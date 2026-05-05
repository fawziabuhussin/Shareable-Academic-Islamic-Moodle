/**
 * Module-specific types and DTOs
 */

/**
 * DTO for creating a new module
 */
export interface CreateModuleDTO {
  title: string;
  order?: number;
}

/**
 * DTO for updating an existing module
 */
export interface UpdateModuleDTO {
  title?: string;
  order?: number;
}

/**
 * Module with relations (includes related data)
 */
export interface ModuleWithRelations {
  id: string;
  courseId: string;
  title: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  course?: {
    id: string;
    title: string;
    teacherId: string;
  };
  lessons?: Array<{
    id: string;
    title: string;
    type: string;
    order: number;
  }>;
}
