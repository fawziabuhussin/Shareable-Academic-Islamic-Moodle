/**
 * Category-specific types and DTOs
 */

/**
 * DTO for creating a new category
 */
export interface CreateCategoryDTO {
  title: string;
  description?: string;
  order?: number;
}

/**
 * DTO for updating an existing category
 */
export interface UpdateCategoryDTO {
  title?: string;
  description?: string | null;
  order?: number;
}

/**
 * Category with relations (includes related data)
 */
export interface CategoryWithRelations {
  id: string;
  title: string;
  description: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    courses: number;
  };
}
