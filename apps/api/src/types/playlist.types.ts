/**
 * Playlist-specific types and DTOs
 */

/**
 * DTO for creating a course from a YouTube playlist
 */
export interface CreateCourseFromPlaylistDTO {
  playlistUrl: string;
  courseTitle: string;
  courseDescription?: string;
  categoryId: string;
  coverImage?: string;
  price?: number;
  status?: string;
  teacherId?: string; // Only for admins
}

/**
 * Video information extracted from playlist
 */
export interface PlaylistVideo {
  videoId: string;
  title: string;
}

/**
 * Response for course creation from playlist
 */
export interface CourseFromPlaylistResponse {
  course: any; // Full course with relations
  module: any;
  lessons?: any[];
  lesson?: any; // Fallback single lesson
  videosCount: number;
  message: string;
}

/** Append lessons from a YouTube playlist into an existing module */
export interface ImportLessonsFromPlaylistDTO {
  moduleId: string;
  playlistUrl: string;
}

export interface ImportLessonsFromPlaylistResponse {
  lessons: any[];
  videosCount: number;
  message: string;
}

/**
 * DTO for creating a module from a YouTube playlist within an existing course
 */
export interface CreateModuleFromPlaylistDTO {
  courseId: string;
  moduleTitle: string;
  playlistUrl: string;
}

/**
 * Response for module creation from playlist
 */
export interface ModuleFromPlaylistResponse {
  module: any;
  lessons?: any[];
  lesson?: any; // Fallback single lesson
  videosCount: number;
  message: string;
}
