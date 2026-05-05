/**
 * Lesson Routes
 * HTTP layer - delegates to LessonManager
 */
import express from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { lessonManager } from '../managers/lesson.manager';
import { createLessonSchema, updateLessonSchema, reorderLessonsSchema } from '../schemas/lesson.schema';

const router = express.Router();

/**
 * GET /:id - Get lesson by ID (for enrolled students or course teacher/admin)
 */
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await lessonManager.getLesson(
      { userId: req.user!.userId, role: req.user!.role },
      id
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch lesson:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch lesson' });
  }
});

/**
 * POST / - Create lesson (Teacher/Admin)
 */
router.post('/', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const data = createLessonSchema.parse(req.body);
    const { moduleId } = req.body;

    if (!moduleId) {
      return res.status(400).json({ message: 'moduleId is required' });
    }

    const result = await lessonManager.createLesson(
      { userId: req.user!.userId, role: req.user!.role },
      moduleId,
      data
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.status(201).json(result.data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    console.error('Failed to create lesson:', error);
    res.status(500).json({ message: error.message || 'Failed to create lesson' });
  }
});

/**
 * PUT /reorder - Reorder lessons within a module (Teacher/Admin)
 */
router.put('/reorder', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const data = reorderLessonsSchema.parse(req.body);

    const result = await lessonManager.reorderLessons(
      { userId: req.user!.userId, role: req.user!.role },
      data.moduleId,
      data.lessonIds
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json({ message: 'تم إعادة ترتيب الدروس بنجاح' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    console.error('Failed to reorder lessons:', error);
    res.status(500).json({ message: error.message || 'Failed to reorder lessons' });
  }
});

/**
 * PUT /:id - Update lesson
 */
router.put('/:id', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateLessonSchema.parse(req.body);

    const result = await lessonManager.updateLesson(
      { userId: req.user!.userId, role: req.user!.role },
      id,
      data
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    console.error('Failed to update lesson:', error);
    res.status(500).json({ message: error.message || 'Failed to update lesson' });
  }
});

/**
 * DELETE /:id - Delete lesson
 */
router.delete('/:id', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await lessonManager.deleteLesson(
      { userId: req.user!.userId, role: req.user!.role },
      id
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json({ message: 'Lesson deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete lesson:', error);
    res.status(500).json({ message: error.message || 'Failed to delete lesson' });
  }
});

export default router;
