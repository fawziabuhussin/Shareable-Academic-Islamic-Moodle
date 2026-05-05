/**
 * Playlist Repository
 * Data access layer for playlist-related operations (course/module/lesson creation)
 */
import { prisma } from '../utils/prisma';

export class PlaylistRepository {
  /**
   * Create a course with basic info
   */
  async createCourse(data: {
    title: string;
    description: string;
    categoryId: string;
    teacherId: string;
    coverImage?: string;
    price?: number;
    status?: string;
  }) {
    return prisma.course.create({
      data: {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        teacherId: data.teacherId,
        coverImage: data.coverImage || undefined,
        price: data.price || 0,
        status: data.status || 'DRAFT',
      },
      include: {
        category: true,
        teacher: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Create a module for a course with explicit order
   */
  async createModule(courseId: string, title: string, order: number) {
    return prisma.module.create({
      data: {
        courseId,
        title,
        order,
      },
    });
  }

  /**
   * Create a module for a course with auto-calculated order
   */
  async createModuleAutoOrder(courseId: string, title: string) {
    const maxOrder = await prisma.module.findFirst({
      where: { courseId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const order = (maxOrder?.order ?? 0) + 1;

    return prisma.module.create({
      data: {
        courseId,
        title,
        order,
      },
    });
  }

  /**
   * Create a single lesson
   */
  async createLesson(data: {
    moduleId: string;
    title: string;
    type: string;
    order: number;
    youtubeUrl?: string;
    youtubePlaylistId?: string;
  }) {
    return prisma.lesson.create({
      data: {
        moduleId: data.moduleId,
        title: data.title,
        type: data.type,
        order: data.order,
        youtubeUrl: data.youtubeUrl,
        youtubePlaylistId: data.youtubePlaylistId,
      },
    });
  }

  /**
   * Create multiple lessons in bulk
   */
  async createLessons(
    lessons: Array<{
      moduleId: string;
      title: string;
      type: string;
      order: number;
      youtubeUrl?: string;
    }>
  ) {
    return Promise.all(
      lessons.map((lesson) =>
        prisma.lesson.create({
          data: lesson,
        })
      )
    );
  }
}

/**
 * Singleton instance
 */
export const playlistRepository = new PlaylistRepository();
