/**
 * Category Manager
 * Business logic layer for category management
 */
import { categoryRepository } from '../repositories/category.repository';
import { AuthContext } from '../types/common.types';
import { CreateCategoryDTO, UpdateCategoryDTO, CategoryWithRelations } from '../types/category.types';

/**
 * Result types for manager operations
 */
export interface CategoryListResult {
  success: boolean;
  data?: CategoryWithRelations[];
  error?: { status: number; message: string };
}

export interface CategoryResult {
  success: boolean;
  data?: CategoryWithRelations;
  error?: { status: number; message: string };
}

export interface DeleteResult {
  success: boolean;
  error?: { status: number; message: string };
}

export class CategoryManager {
  /**
   * List all categories (public access)
   */
  async listCategories(): Promise<CategoryListResult> {
    const categories = await categoryRepository.findAll();
    return { success: true, data: categories };
  }

  /**
   * Get a single category
   */
  async getCategory(id: string): Promise<CategoryResult> {
    const category = await categoryRepository.findById(id);
    
    if (!category) {
      return {
        success: false,
        error: { status: 404, message: 'Category not found' },
      };
    }

    return { success: true, data: category };
  }

  /**
   * Create a new category (Admin only)
   */
  async createCategory(auth: AuthContext, data: CreateCategoryDTO): Promise<CategoryResult> {
    // Check authorization - only ADMIN can create
    if (auth.role !== 'ADMIN') {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالإضافة' },
      };
    }

    const category = await categoryRepository.create(data);
    return { success: true, data: category };
  }

  /**
   * Update an existing category (Admin only)
   */
  async updateCategory(
    auth: AuthContext,
    id: string,
    data: UpdateCategoryDTO
  ): Promise<CategoryResult> {
    // Check authorization - only ADMIN can update
    if (auth.role !== 'ADMIN') {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالتعديل' },
      };
    }

    // Verify category exists
    const exists = await categoryRepository.exists(id);
    if (!exists) {
      return {
        success: false,
        error: { status: 404, message: 'Category not found' },
      };
    }

    const category = await categoryRepository.update(id, data);
    return { success: true, data: category };
  }

  /**
   * Delete a category (Admin only)
   */
  async deleteCategory(auth: AuthContext, id: string): Promise<DeleteResult> {
    // Check authorization - only ADMIN can delete
    if (auth.role !== 'ADMIN') {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالحذف' },
      };
    }

    // Verify category exists
    const exists = await categoryRepository.exists(id);
    if (!exists) {
      return {
        success: false,
        error: { status: 404, message: 'Category not found' },
      };
    }

    await categoryRepository.delete(id);
    return { success: true };
  }
}

/**
 * Singleton instance
 */
export const categoryManager = new CategoryManager();
