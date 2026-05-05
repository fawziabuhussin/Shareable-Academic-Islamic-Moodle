/**
 * LiveSession Routes
 * HTTP layer - delegates to LiveSessionManager
 */
import express from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { liveSessionManager } from '../managers/liveSession.manager';
import { createLiveSessionSchema, updateLiveSessionSchema } from '../schemas/liveSession.schema';

const router = express.Router();

/**
 * GET /course/:courseId - Get live sessions for a course
 */
router.get('/course/:courseId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;

    const result = await liveSessionManager.listLiveSessions(
      { userId: req.user!.userId, role: req.user!.role },
      courseId
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch live sessions:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch live sessions' });
  }
});

/**
 * POST / - Create live session (Teacher/Admin)
 */
router.post('/', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const validatedData = createLiveSessionSchema.parse(req.body);
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ message: 'courseId is required' });
    }

    // Convert string date to Date object
    const data = {
      ...validatedData,
      scheduledAt: new Date(validatedData.scheduledAt),
    };

    const result = await liveSessionManager.createLiveSession(
      { userId: req.user!.userId, role: req.user!.role },
      courseId,
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
    console.error('Failed to create live session:', error);
    res.status(500).json({ message: error.message || 'Failed to create live session' });
  }
});

/**
 * PUT /:id - Update live session
 */
router.put('/:id', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateLiveSessionSchema.parse(req.body);
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ message: 'courseId is required' });
    }

    // Convert string date to Date object if present
    const data: any = { ...validatedData };
    if (data.scheduledAt) {
      data.scheduledAt = new Date(data.scheduledAt);
    }

    const result = await liveSessionManager.updateLiveSession(
      { userId: req.user!.userId, role: req.user!.role },
      courseId,
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
    console.error('Failed to update live session:', error);
    res.status(500).json({ message: error.message || 'Failed to update live session' });
  }
});

/**
 * DELETE /:id - Delete live session
 */
router.delete('/:id', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { courseId } = req.query;

    if (!courseId || typeof courseId !== 'string') {
      return res.status(400).json({ message: 'courseId is required' });
    }

    const result = await liveSessionManager.deleteLiveSession(
      { userId: req.user!.userId, role: req.user!.role },
      courseId,
      id
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json({ message: 'Live session deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete live session:', error);
    res.status(500).json({ message: error.message || 'Failed to delete live session' });
  }
});

export default router;
