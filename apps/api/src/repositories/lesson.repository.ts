/**
 * Lesson Repository
 * Data access layer for Lesson-related database operations
 */
import { prisma } from '../utils/prisma';
import { LessonWithRelations, CreateLessonDTO, UpdateLessonDTO } from '../types/lesson.types';

/**
 * Include configuration for fetching lessons with relations
 */
const lessonInclude = {
  module: {
    include: {
      course: {
        include: {
          teacher: {
            select: { id: true, name: true },
          },
          enrollments: {
            select: {
              userId: true,
              status: true,
            },
          },
        },
      },
    },
  },
  resources: {
    orderBy: { order: 'asc' as const },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
  },
};

export class LessonRepository {
  /**
   * Find all lessons for a module
   */
  async findByModuleId(moduleId: string): Promise<LessonWithRelations[]> {
    return prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { order: 'asc' },
      include: lessonInclude,
    });
  }

  /**
   * Find a single lesson by ID
   */
  async findById(id: string): Promise<LessonWithRelations | null> {
    return prisma.lesson.findUnique({
      where: { id },
      include: lessonInclude,
    });
  }

  /**
   * Create a new lesson
   */
  async create(data: CreateLessonDTO, moduleId: string): Promise<LessonWithRelations> {
    // Get max order if not provided
    let order = data.order;
    if (order === undefined) {
      const maxOrder = await prisma.lesson.findFirst({
        where: { moduleId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      order = (maxOrder?.order ?? 0) + 1;
    }

    // Clean up data based on type
    const lessonData: any = {
      moduleId,
      title: data.title,
      type: data.type,
      order,
    };

    if (data.durationMinutes !== undefined) {
      lessonData.durationMinutes = data.durationMinutes;
    }

    if (data.type === 'VIDEO' || data.type === 'LIVE' || data.type === 'PLAYLIST') {
      if (data.youtubeUrl && data.youtubeUrl.trim() !== '') {
        lessonData.youtubeUrl = data.youtubeUrl.trim();
      }
      if (data.type === 'PLAYLIST' && data.youtubePlaylistId) {
        lessonData.youtubePlaylistId = data.youtubePlaylistId;
      }
    } else if (data.type === 'TEXT') {
      if (data.textContent) {
        lessonData.textContent = data.textContent;
      }
    }

    return prisma.lesson.create({
      data: lessonData,
      include: lessonInclude,
    });
  }

  /**
   * Update an existing lesson
   */
  async update(id: string, data: UpdateLessonDTO): Promise<LessonWithRelations> {
    // Clean up data based on type
    const updateData: any = {};
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes;
    if (data.order !== undefined) updateData.order = data.order;

    if (data.type === 'VIDEO' || data.type === 'LIVE' || data.type === 'PLAYLIST') {
      if (data.youtubeUrl !== undefined) {
        updateData.youtubeUrl = data.youtubeUrl && data.youtubeUrl.trim() !== '' ? data.youtubeUrl.trim() : null;
      }
      if (data.type === 'PLAYLIST' && data.youtubePlaylistId !== undefined) {
        updateData.youtubePlaylistId = data.youtubePlaylistId;
      }
      // Clear textContent if switching to video type
      if (data.type) {
        updateData.textContent = null;
      }
    } else if (data.type === 'TEXT') {
      if (data.textContent !== undefined) {
        updateData.textContent = data.textContent;
      }
      // Clear youtubeUrl if switching to text type
      if (data.type) {
        updateData.youtubeUrl = null;
        updateData.youtubePlaylistId = null;
      }
    } else {
      // Handle partial updates without type change
      if (data.youtubeUrl !== undefined) {
        updateData.youtubeUrl = data.youtubeUrl && data.youtubeUrl.trim() !== '' ? data.youtubeUrl.trim() : null;
      }
      if (data.textContent !== undefined) {
        updateData.textContent = data.textContent;
      }
      if (data.youtubePlaylistId !== undefined) {
        updateData.youtubePlaylistId = data.youtubePlaylistId;
      }
    }

    return prisma.lesson.update({
      where: { id },
      data: updateData,
      include: lessonInclude,
    });
  }

  /**
   * Delete a lesson and recalculate order for remaining lessons in the module
   */
  async delete(id: string): Promise<void> {
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      select: { moduleId: true },
    });
    await prisma.lesson.delete({ where: { id } });
    if (lesson) {
      const remaining = await prisma.lesson.findMany({
        where: { moduleId: lesson.moduleId },
        orderBy: { order: 'asc' },
        select: { id: true },
      });
      if (remaining.length > 0) {
        await prisma.$transaction(
          remaining.map((l, index) =>
            prisma.lesson.update({
              where: { id: l.id },
              data: { order: index + 1 },
            })
          )
        );
      }
    }
  }

  /**
   * Reorder lessons within a module
   * Updates the order field for each lesson based on position in the array
   */
  async reorder(moduleId: string, lessonIds: string[]): Promise<void> {
    await prisma.$transaction(
      lessonIds.map((id, index) =>
        prisma.lesson.update({
          where: { id },
          data: { order: index + 1 },
        })
      )
    );
  }

  /**
   * Check if lesson exists and belongs to module
   */
  async existsInModule(id: string, moduleId: string): Promise<boolean> {
    const lesson = await prisma.lesson.findFirst({
      where: { id, moduleId },
    });
    return !!lesson;
  }

  /**
   * Get course ID from lesson through module
   */
  async getCourseIdByLessonId(lessonId: string): Promise<string | null> {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        module: {
          select: { courseId: true },
        },
      },
    });
    return lesson?.module.courseId || null;
  }
}

/**
 * Singleton instance
 */
export const lessonRepository = new LessonRepository();
