/**
 * Progress Routes
 * HTTP layer - delegates to ProgressManager
 */
import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { progressManager } from '../managers/progress.manager';

const router = express.Router();

/**
 * POST /progress/lessons/:lessonId/complete - Mark lesson as completed
 */
router.post('/lessons/:lessonId/complete', authenticate, async (req: AuthRequest, res) => {
  try {
    const { lessonId } = req.params;

    const result = await progressManager.completeLesson(
      { userId: req.user!.userId, role: req.user!.role },
      lessonId
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to update progress:', error);
    res.status(500).json({ message: error.message || 'Failed to update progress' });
  }
});

/**
 * GET /progress/lessons/:lessonId/status - Check if a lesson is completed
 */
router.get('/lessons/:lessonId/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { lessonId } = req.params;

    const result = await progressManager.getLessonStatus(
      { userId: req.user!.userId, role: req.user!.role },
      lessonId
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to check lesson status:', error);
    res.status(500).json({ message: error.message || 'Failed to check lesson status' });
  }
});

/**
 * GET /progress/courses/:courseId - Get progress for a course
 */
router.get('/courses/:courseId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;

    const result = await progressManager.getCourseProgress(
      { userId: req.user!.userId, role: req.user!.role },
      courseId
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch progress:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch progress' });
  }
});

export default router;
