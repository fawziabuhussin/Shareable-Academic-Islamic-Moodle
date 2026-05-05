/**
 * Quiz Routes
 * HTTP layer - delegates to QuizManager
 */
import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { quizManager } from '../managers/quiz.manager';
import { submitQuizAttemptSchema } from '../schemas/quiz.schema';

const router = express.Router();

/**
 * GET /course/:courseId - List all quizzes for a course
 */
router.get('/course/:courseId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;

    const result = await quizManager.listQuizzes(
      { userId: req.user!.userId, role: req.user!.role },
      courseId
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch quizzes:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch quizzes' });
  }
});

/**
 * POST /:quizId/attempt - Submit quiz attempt
 */
router.post('/:quizId/attempt', authenticate, async (req: AuthRequest, res) => {
  try {
    const { quizId } = req.params;
    const data = submitQuizAttemptSchema.parse(req.body);

    const result = await quizManager.submitQuizAttempt(
      { userId: req.user!.userId, role: req.user!.role },
      quizId,
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
    console.error('Failed to submit quiz:', error);
    res.status(500).json({ message: error.message || 'Failed to submit quiz' });
  }
});

export default router;




