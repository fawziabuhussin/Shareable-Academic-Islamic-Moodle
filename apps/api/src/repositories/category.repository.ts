/**
 * Category Repository
 * Data access layer for Category-related database operations
 */
import { prisma } from '../utils/prisma';
import { CategoryWithRelations, CreateCategoryDTO, UpdateCategoryDTO } from '../types/category.types';

/**
 * Include configuration for fetching categories with relations
 */
const categoryInclude = {
  _count: {
    select: { courses: true },
  },
};

export class CategoryRepository {
  /**
   * Find all categories
   */
  async findAll(): Promise<CategoryWithRelations[]> {
    return prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: categoryInclude,
    });
  }

  /**
   * Find a single category by ID
   */
  async findById(id: string): Promise<CategoryWithRelations | null> {
    return prisma.category.findUnique({
      where: { id },
      include: categoryInclude,
    });
  }

  /**
   * Create a new category
   */
  async create(data: CreateCategoryDTO): Promise<CategoryWithRelations> {
    return prisma.category.create({
      data,
      include: categoryInclude,
    });
  }

  /**
   * Update an existing category
   */
  async update(id: string, data: UpdateCategoryDTO): Promise<CategoryWithRelations> {
    return prisma.category.update({
      where: { id },
      data,
      include: categoryInclude,
    });
  }

  /**
   * Delete a category
   */
  async delete(id: string): Promise<void> {
    await prisma.category.delete({ where: { id } });
  }

  /**
   * Check if category exists
   */
  async exists(id: string): Promise<boolean> {
    const category = await prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!category;
  }
}

/**
 * Singleton instance
 */
export const categoryRepository = new CategoryRepository();
