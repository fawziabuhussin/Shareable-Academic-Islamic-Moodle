/**
 * Resource Repository
 * Data access layer for Resource-related database operations
 */
import { prisma } from '../utils/prisma';
import { ResourceWithCreator, CreateResourceDTO, UpdateResourceDTO } from '../types/resource.types';
import { ParentInfo } from '../types/common.types';

/**
 * Include configuration for fetching resources with creator information
 */
const resourceInclude = {
  createdBy: {
    select: { id: true, name: true },
  },
};

export class ResourceRepository {
  /**
   * Find all resources for a parent (course or lesson)
   * @param parent - Parent information (course or lesson)
   * @returns Array of resources with creator information
   */
  async findByParent(parent: ParentInfo): Promise<ResourceWithCreator[]> {
    const where = parent.type === 'course' 
      ? { courseId: parent.id }
      : { lessonId: parent.id };
    
    return prisma.resource.findMany({
      where,
      orderBy: { order: 'asc' },
      include: resourceInclude,
    });
  }

  /**
   * Find a single resource by ID within a parent context
   * @param id - Resource ID
   * @param parent - Parent information (course or lesson)
   * @returns Resource with creator information, or null if not found
   */
  async findById(id: string, parent: ParentInfo): Promise<ResourceWithCreator | null> {
    const where = parent.type === 'course'
      ? { id, courseId: parent.id }
      : { id, lessonId: parent.id };
    
    return prisma.resource.findFirst({
      where,
      include: resourceInclude,
    });
  }

  /**
   * Create a new resource
   * @param data - Resource data
   * @param parent - Parent information (course or lesson)
   * @param createdById - ID of the user creating the resource
   * @param order - Order position for the resource
   * @returns Created resource with creator information
   */
  async create(
    data: CreateResourceDTO,
    parent: ParentInfo,
    createdById: string,
    order: number
  ): Promise<ResourceWithCreator> {
    const resourceData: any = {
      title: data.title,
      url: data.url,
      order,
      createdById,
    };

    // Add optional description
    if (data.description) {
      resourceData.description = data.description;
    }

    // Set parent relationship
    if (parent.type === 'course') {
      resourceData.courseId = parent.id;
    } else {
      resourceData.lessonId = parent.id;
    }

    return prisma.resource.create({
      data: resourceData,
      include: resourceInclude,
    });
  }

  /**
   * Update an existing resource
   * @param id - Resource ID
   * @param data - Updated resource data
   * @returns Updated resource with creator information
   */
  async update(id: string, data: UpdateResourceDTO): Promise<ResourceWithCreator> {
    const updateData: any = {};
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.url !== undefined) updateData.url = data.url;

    return prisma.resource.update({
      where: { id },
      data: updateData,
      include: resourceInclude,
    });
  }

  /**
   * Delete a resource
   * @param id - Resource ID
   */
  async delete(id: string): Promise<void> {
    await prisma.resource.delete({ where: { id } });
  }

  /**
   * Get the next order number for a new resource
   * @param parent - Parent information (course or lesson)
   * @returns Next available order number
   */
  async getNextOrder(parent: ParentInfo): Promise<number> {
    const where = parent.type === 'course'
      ? { courseId: parent.id }
      : { lessonId: parent.id };

    const maxOrder = await prisma.resource.findFirst({
      where,
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    return (maxOrder?.order ?? -1) + 1;
  }
}

/**
 * Singleton instance of ResourceRepository
 */
export const resourceRepository = new ResourceRepository();
