/**
 * Module Manager
 * Business logic layer for module management
 */
import { moduleRepository } from '../repositories/module.repository';
import { authorizationService } from '../services/authorization.service';
import { AuthContext } from '../types/common.types';
import { CreateModuleDTO, UpdateModuleDTO, ModuleWithRelations } from '../types/module.types';

/**
 * Result types for manager operations
 */
export interface ModuleListResult {
  success: boolean;
  data?: ModuleWithRelations[];
  error?: { status: number; message: string };
}

export interface ModuleResult {
  success: boolean;
  data?: ModuleWithRelations;
  error?: { status: number; message: string };
}

export interface DeleteResult {
  success: boolean;
  error?: { status: number; message: string };
}

export class ModuleManager {
  /**
   * List all modules for a course
   */
  async listModules(auth: AuthContext, courseId: string): Promise<ModuleListResult> {
    // Check authorization
    const access = await authorizationService.checkReadAccess(auth, { type: 'course', id: courseId });
    
    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول' },
      };
    }

    const modules = await moduleRepository.findByCourseId(courseId);
    return { success: true, data: modules };
  }

  /**
   * Get a single module
   */
  async getModule(auth: AuthContext, courseId: string, moduleId: string): Promise<ModuleResult> {
    // Check authorization
    const access = await authorizationService.checkReadAccess(auth, { type: 'course', id: courseId });
    
    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول' },
      };
    }

    const module = await moduleRepository.findById(moduleId);
    
    if (!module || module.courseId !== courseId) {
      return {
        success: false,
        error: { status: 404, message: 'Module not found' },
      };
    }

    return { success: true, data: module };
  }

  /**
   * Create a new module
   */
  async createModule(
    auth: AuthContext,
    courseId: string,
    data: CreateModuleDTO
  ): Promise<ModuleResult> {
    // Validate title is not empty
    if (!data.title || data.title.trim().length === 0) {
      return {
        success: false,
        error: { status: 400, message: 'عنوان الوحدة مطلوب' },
      };
    }

    // Check authorization
    const access = await authorizationService.checkWriteAccess(auth, { type: 'course', id: courseId });
    
    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالإضافة' },
      };
    }

    const module = await moduleRepository.create(data, courseId);
    return { success: true, data: module };
  }

  /**
   * Update an existing module
   */
  async updateModule(
    auth: AuthContext,
    courseId: string,
    moduleId: string,
    data: UpdateModuleDTO
  ): Promise<ModuleResult> {
    // Check authorization
    const access = await authorizationService.checkWriteAccess(auth, { type: 'course', id: courseId });
    
    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالتعديل' },
      };
    }

    // Verify module exists and belongs to course
    const exists = await moduleRepository.existsInCourse(moduleId, courseId);
    if (!exists) {
      return {
        success: false,
        error: { status: 404, message: 'Module not found' },
      };
    }

    const module = await moduleRepository.update(moduleId, data);
    return { success: true, data: module };
  }

  /**
   * Delete a module
   */
  async deleteModule(
    auth: AuthContext,
    moduleId: string,
    courseId?: string
  ): Promise<DeleteResult> {
    // If courseId not provided, look it up from the module
    if (!courseId) {
      const mod = await moduleRepository.findById(moduleId);
      if (!mod) {
        return {
          success: false,
          error: { status: 404, message: 'Module not found' },
        };
      }
      courseId = mod.courseId;
    }

    // Check authorization
    const access = await authorizationService.checkWriteAccess(auth, { type: 'course', id: courseId });
    
    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالحذف' },
      };
    }

    // Verify module exists and belongs to course
    const exists = await moduleRepository.existsInCourse(moduleId, courseId);
    if (!exists) {
      return {
        success: false,
        error: { status: 404, message: 'Module not found' },
      };
    }

    await moduleRepository.delete(moduleId);
    return { success: true };
  }
}

/**
 * Singleton instance
 */
export const moduleManager = new ModuleManager();
