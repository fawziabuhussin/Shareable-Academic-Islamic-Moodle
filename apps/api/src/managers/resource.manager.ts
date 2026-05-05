/**
 * Resource Manager
 * Business logic layer for resource management
 * Orchestrates authorization checks and data operations
 */
import { resourceRepository } from '../repositories/resource.repository';
import { authorizationService } from '../services/authorization.service';
import { ParentInfo, AuthContext } from '../types/common.types';
import { CreateResourceDTO, UpdateResourceDTO, ResourceWithCreator } from '../types/resource.types';

/**
 * Result type for list operations
 */
export interface ResourceListResult {
  success: boolean;
  data?: ResourceWithCreator[];
  error?: { status: number; message: string };
}

/**
 * Result type for single resource operations
 */
export interface ResourceResult {
  success: boolean;
  data?: ResourceWithCreator;
  error?: { status: number; message: string };
}

/**
 * Result type for delete operations
 */
export interface DeleteResult {
  success: boolean;
  error?: { status: number; message: string };
}

export class ResourceManager {
  /**
   * List all resources for a parent (course or lesson)
   * Checks read access before returning resources
   * 
   * @param auth - Authentication context
   * @param parent - Parent information (course or lesson)
   * @returns Result with array of resources or error
   */
  async listResources(auth: AuthContext, parent: ParentInfo): Promise<ResourceListResult> {
    const access = await authorizationService.checkReadAccess(auth, parent);
    
    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول إلى هذه الموارد' },
      };
    }

    const resources = await resourceRepository.findByParent(parent);
    return { success: true, data: resources };
  }

  /**
   * Get a single resource by ID
   * Checks read access and verifies resource belongs to parent
   * 
   * @param auth - Authentication context
   * @param parent - Parent information (course or lesson)
   * @param resourceId - Resource ID
   * @returns Result with resource or error
   */
  async getResource(auth: AuthContext, parent: ParentInfo, resourceId: string): Promise<ResourceResult> {
    const access = await authorizationService.checkReadAccess(auth, parent);
    
    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول إلى هذا المورد' },
      };
    }

    const resource = await resourceRepository.findById(resourceId, parent);
    
    if (!resource) {
      return {
        success: false,
        error: { status: 404, message: 'Resource not found' },
      };
    }

    return { success: true, data: resource };
  }

  /**
   * Create a new resource
   * Checks write access and automatically assigns order number
   * 
   * @param auth - Authentication context
   * @param parent - Parent information (course or lesson)
   * @param data - Resource data to create
   * @returns Result with created resource or error
   */
  async createResource(
    auth: AuthContext,
    parent: ParentInfo,
    data: CreateResourceDTO
  ): Promise<ResourceResult> {
    const access = await authorizationService.checkWriteAccess(auth, parent);
    
    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بإضافة موارد' },
      };
    }

    // Get the next order number for this parent
    const order = await resourceRepository.getNextOrder(parent);
    
    // Create the resource
    const resource = await resourceRepository.create(data, parent, auth.userId, order);
    
    return { success: true, data: resource };
  }

  /**
   * Update an existing resource
   * Checks write access and verifies resource belongs to parent
   * 
   * @param auth - Authentication context
   * @param parent - Parent information (course or lesson)
   * @param resourceId - Resource ID
   * @param data - Updated resource data
   * @returns Result with updated resource or error
   */
  async updateResource(
    auth: AuthContext,
    parent: ParentInfo,
    resourceId: string,
    data: UpdateResourceDTO
  ): Promise<ResourceResult> {
    const access = await authorizationService.checkWriteAccess(auth, parent);
    
    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بتعديل هذا المورد' },
      };
    }

    // Verify resource exists and belongs to parent
    const existingResource = await resourceRepository.findById(resourceId, parent);
    
    if (!existingResource) {
      return {
        success: false,
        error: { status: 404, message: 'Resource not found' },
      };
    }

    // Update the resource
    const resource = await resourceRepository.update(resourceId, data);
    return { success: true, data: resource };
  }

  /**
   * Delete a resource
   * Checks write access and verifies resource belongs to parent
   * 
   * @param auth - Authentication context
   * @param parent - Parent information (course or lesson)
   * @param resourceId - Resource ID
   * @returns Result indicating success or error
   */
  async deleteResource(
    auth: AuthContext,
    parent: ParentInfo,
    resourceId: string
  ): Promise<DeleteResult> {
    const access = await authorizationService.checkWriteAccess(auth, parent);
    
    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بحذف هذا المورد' },
      };
    }

    // Verify resource exists and belongs to parent
    const existingResource = await resourceRepository.findById(resourceId, parent);
    
    if (!existingResource) {
      return {
        success: false,
        error: { status: 404, message: 'Resource not found' },
      };
    }

    // Delete the resource
    await resourceRepository.delete(resourceId);
    return { success: true };
  }
}

/**
 * Singleton instance of ResourceManager
 */
export const resourceManager = new ResourceManager();
