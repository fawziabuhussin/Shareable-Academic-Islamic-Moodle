/**
 * LiveSession Manager
 * Business logic layer for live session management
 */
import { liveSessionRepository } from '../repositories/liveSession.repository';
import { authorizationService } from '../services/authorization.service';
import { AuthContext } from '../types/common.types';
import { CreateLiveSessionDTO, UpdateLiveSessionDTO, LiveSessionWithRelations } from '../types/liveSession.types';

/**
 * Result types for manager operations
 */
export interface LiveSessionListResult {
  success: boolean;
  data?: LiveSessionWithRelations[];
  error?: { status: number; message: string };
}

export interface LiveSessionResult {
  success: boolean;
  data?: LiveSessionWithRelations;
  error?: { status: number; message: string };
}

export interface DeleteResult {
  success: boolean;
  error?: { status: number; message: string };
}

export class LiveSessionManager {
  /**
   * List all live sessions for a course
   */
  async listLiveSessions(auth: AuthContext, courseId: string): Promise<LiveSessionListResult> {
    // Check authorization
    const access = await authorizationService.checkReadAccess(auth, { type: 'course', id: courseId });
    
    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول' },
      };
    }

    const sessions = await liveSessionRepository.findByCourseId(courseId);
    return { success: true, data: sessions };
  }

  /**
   * Get a single live session
   */
  async getLiveSession(auth: AuthContext, courseId: string, sessionId: string): Promise<LiveSessionResult> {
    // Check authorization
    const access = await authorizationService.checkReadAccess(auth, { type: 'course', id: courseId });
    
    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول' },
      };
    }

    const session = await liveSessionRepository.findById(sessionId);
    
    if (!session || session.courseId !== courseId) {
      return {
        success: false,
        error: { status: 404, message: 'Live session not found' },
      };
    }

    return { success: true, data: session };
  }

  /**
   * Create a new live session
   */
  async createLiveSession(
    auth: AuthContext,
    courseId: string,
    data: CreateLiveSessionDTO
  ): Promise<LiveSessionResult> {
    // Check authorization
    const access = await authorizationService.checkWriteAccess(auth, { type: 'course', id: courseId });
    
    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالإضافة' },
      };
    }

    const session = await liveSessionRepository.create(data, courseId);
    return { success: true, data: session };
  }

  /**
   * Update an existing live session
   */
  async updateLiveSession(
    auth: AuthContext,
    courseId: string,
    sessionId: string,
    data: UpdateLiveSessionDTO
  ): Promise<LiveSessionResult> {
    // Check authorization
    const access = await authorizationService.checkWriteAccess(auth, { type: 'course', id: courseId });
    
    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالتعديل' },
      };
    }

    // Verify session exists and belongs to course
    const exists = await liveSessionRepository.existsInCourse(sessionId, courseId);
    if (!exists) {
      return {
        success: false,
        error: { status: 404, message: 'Live session not found' },
      };
    }

    const session = await liveSessionRepository.update(sessionId, data);
    return { success: true, data: session };
  }

  /**
   * Delete a live session
   */
  async deleteLiveSession(
    auth: AuthContext,
    courseId: string,
    sessionId: string
  ): Promise<DeleteResult> {
    // Check authorization
    const access = await authorizationService.checkWriteAccess(auth, { type: 'course', id: courseId });
    
    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالحذف' },
      };
    }

    // Verify session exists and belongs to course
    const exists = await liveSessionRepository.existsInCourse(sessionId, courseId);
    if (!exists) {
      return {
        success: false,
        error: { status: 404, message: 'Live session not found' },
      };
    }

    await liveSessionRepository.delete(sessionId);
    return { success: true };
  }
}

/**
 * Singleton instance
 */
export const liveSessionManager = new LiveSessionManager();
