/**
 * LiveSession-specific types and DTOs
 */

/**
 * DTO for creating a new live session
 */
export interface CreateLiveSessionDTO {
  title: string;
  scheduledAt: Date;
  provider: 'YOUTUBE' | 'FACEBOOK' | 'ZOOM' | 'MEET' | 'OTHER';
  embedUrl: string;
  notes?: string;
}

/**
 * DTO for updating an existing live session
 */
export interface UpdateLiveSessionDTO {
  title?: string;
  scheduledAt?: Date;
  provider?: 'YOUTUBE' | 'FACEBOOK' | 'ZOOM' | 'MEET' | 'OTHER';
  embedUrl?: string;
  notes?: string;
}

/**
 * LiveSession with relations (includes related data)
 */
export interface LiveSessionWithRelations {
  id: string;
  courseId: string;
  title: string;
  scheduledAt: Date;
  provider: string;
  embedUrl: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  course?: {
    id: string;
    title: string;
    teacherId: string;
  };
}
