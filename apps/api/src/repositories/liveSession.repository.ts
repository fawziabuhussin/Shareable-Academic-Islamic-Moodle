/**
 * LiveSession Repository
 * Data access layer for LiveSession-related database operations
 */
import { prisma } from '../utils/prisma';
import { LiveSessionWithRelations, CreateLiveSessionDTO, UpdateLiveSessionDTO } from '../types/liveSession.types';

/**
 * Include configuration for fetching live sessions with relations
 */
const liveSessionInclude = {
  course: {
    select: { id: true, title: true, teacherId: true },
  },
};

export class LiveSessionRepository {
  /**
   * Find all live sessions for a course
   */
  async findByCourseId(courseId: string): Promise<LiveSessionWithRelations[]> {
    return prisma.liveSession.findMany({
      where: { courseId },
      orderBy: { scheduledAt: 'asc' },
      include: liveSessionInclude,
    });
  }

  /**
   * Find a single live session by ID
   */
  async findById(id: string): Promise<LiveSessionWithRelations | null> {
    return prisma.liveSession.findUnique({
      where: { id },
      include: liveSessionInclude,
    });
  }

  /**
   * Create a new live session
   */
  async create(data: CreateLiveSessionDTO, courseId: string): Promise<LiveSessionWithRelations> {
    return prisma.liveSession.create({
      data: {
        title: data.title,
        scheduledAt: data.scheduledAt,
        provider: data.provider,
        embedUrl: data.embedUrl,
        notes: data.notes,
        courseId,
      },
      include: liveSessionInclude,
    });
  }

  /**
   * Update an existing live session
   */
  async update(id: string, data: UpdateLiveSessionDTO): Promise<LiveSessionWithRelations> {
    return prisma.liveSession.update({
      where: { id },
      data,
      include: liveSessionInclude,
    });
  }

  /**
   * Delete a live session
   */
  async delete(id: string): Promise<void> {
    await prisma.liveSession.delete({ where: { id } });
  }

  /**
   * Check if live session exists and belongs to course
   */
  async existsInCourse(id: string, courseId: string): Promise<boolean> {
    const session = await prisma.liveSession.findFirst({
      where: { id, courseId },
    });
    return !!session;
  }
}

/**
 * Singleton instance
 */
export const liveSessionRepository = new LiveSessionRepository();
