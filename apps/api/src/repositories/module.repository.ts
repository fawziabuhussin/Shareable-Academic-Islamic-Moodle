/**
 * Module Repository
 * Data access layer for Module-related database operations
 */
import { prisma } from '../utils/prisma';
import { ModuleWithRelations, CreateModuleDTO, UpdateModuleDTO } from '../types/module.types';

/**
 * Include configuration for fetching modules with relations
 */
const moduleInclude = {
  course: {
    select: { id: true, title: true, teacherId: true },
  },
  lessons: {
    select: {
      id: true,
      title: true,
      type: true,
      order: true,
    },
    orderBy: { order: 'asc' as const },
  },
};

export class ModuleRepository {
  /**
   * Find all modules for a course
   */
  async findByCourseId(courseId: string): Promise<ModuleWithRelations[]> {
    return prisma.module.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      include: moduleInclude,
    });
  }

  /**
   * Find a single module by ID
   */
  async findById(id: string): Promise<ModuleWithRelations | null> {
    return prisma.module.findUnique({
      where: { id },
      include: moduleInclude,
    });
  }

  /**
   * Create a new module
   */
  async create(data: CreateModuleDTO, courseId: string): Promise<ModuleWithRelations> {
    // Get max order if not provided
    let order = data.order;
    if (order === undefined) {
      const maxOrder = await prisma.module.findFirst({
        where: { courseId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      order = (maxOrder?.order ?? 0) + 1;
    }

    return prisma.module.create({
      data: {
        title: data.title,
        order,
        courseId,
      },
      include: moduleInclude,
    });
  }

  /**
   * Update an existing module
   */
  async update(id: string, data: UpdateModuleDTO): Promise<ModuleWithRelations> {
    return prisma.module.update({
      where: { id },
      data,
      include: moduleInclude,
    });
  }

  /**
   * Delete a module
   */
  async delete(id: string): Promise<void> {
    await prisma.module.delete({ where: { id } });
  }

  /**
   * Check if module exists and belongs to course
   */
  async existsInCourse(id: string, courseId: string): Promise<boolean> {
    const module = await prisma.module.findFirst({
      where: { id, courseId },
    });
    return !!module;
  }
}

/**
 * Singleton instance
 */
export const moduleRepository = new ModuleRepository();
