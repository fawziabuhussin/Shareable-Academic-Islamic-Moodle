/**
 * Lesson-specific types and DTOs
 */

/**
 * DTO for creating a new lesson
 */
export interface CreateLessonDTO {
  title: string;
  type: 'VIDEO' | 'TEXT' | 'LIVE' | 'PLAYLIST';
  youtubeUrl?: string;
  youtubePlaylistId?: string;
  textContent?: string;
  durationMinutes?: number;
  order?: number;
}

/**
 * DTO for updating an existing lesson
 */
export interface UpdateLessonDTO {
  title?: string;
  type?: 'VIDEO' | 'TEXT' | 'LIVE' | 'PLAYLIST';
  youtubeUrl?: string | null;
  youtubePlaylistId?: string | null;
  textContent?: string | null;
  durationMinutes?: number;
  order?: number;
}

/**
 * Lesson with relations (includes related data)
 */
export interface LessonWithRelations {
  id: string;
  moduleId: string;
  title: string;
  type: string;
  order: number;
  youtubeUrl: string | null;
  youtubePlaylistId: string | null;
  textContent: string | null;
  durationMinutes: number | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  module?: {
    id: string;
    title: string;
    courseId: string;
    course: {
      id: string;
      title: string;
      teacherId: string;
      teacher?: {
        id: string;
        name: string;
      };
      enrollments?: Array<{
        userId: string;
        status: string;
      }>;
    };
  };
  resources?: Array<{
    id: string;
    title: string;
    description: string | null;
    url: string;
    order: number;
    createdBy: {
      id: string;
      name: string;
    };
  }>;
}
