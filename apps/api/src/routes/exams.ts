/**
 * Exam Routes
 * HTTP layer - delegates to ExamManager
 */
import express from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { examManager } from '../managers/exam.manager';
import {
  createExamSchema,
  updateExamSchema,
  createExamQuestionSchema,
  updateExamQuestionSchema,
  submitExamAttemptSchema,
  gradeExamAttemptSchema,
  updateExamAttemptScoreSchema,
  importExamFromJsonSchema,
} from '../schemas/exam.schema';

const router = express.Router();

/**
 * GET /courses/:courseId/exams - List all exams for a course
 * Supports pagination: ?page=1&limit=20
 */
router.get('/course/:courseId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const { page, limit } = req.query;

    // If pagination params provided, use paginated version
    if (page || limit) {
      const result = await examManager.listExamsPaginated(
        { userId: req.user!.userId, role: req.user!.role },
        courseId,
        {
          page: parseInt(page as string) || 1,
          limit: parseInt(limit as string) || 20,
        }
      );

      if (!result.success) {
        return res.status(result.error!.status).json({ message: result.error!.message });
      }

      return res.json(result.data);
    }

    // Default: unpaginated for backward compatibility
    const result = await examManager.listExams(
      { userId: req.user!.userId, role: req.user!.role },
      courseId
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch exams:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch exams' });
  }
});

/**
 * GET /:id - Get single exam
 */
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await examManager.getExam(
      { userId: req.user!.userId, role: req.user!.role },
      id
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch exam:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch exam' });
  }
});

/**
 * POST / - Create new exam
 */
router.post('/', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const data = createExamSchema.parse(req.body);
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ message: 'courseId is required' });
    }

    const result = await examManager.createExam(
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
    console.error('Failed to create exam:', error);
    res.status(500).json({ message: error.message || 'Failed to create exam' });
  }
});

/**
 * POST /import - Import exam from Google Forms JSON URL
 */
router.post('/import', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const data = importExamFromJsonSchema.parse(req.body);
    const { courseId, jsonUrl, ...examData } = data;

    if (!courseId) {
      return res.status(400).json({ message: 'courseId is required' });
    }

    if (!jsonUrl) {
      return res.status(400).json({ message: 'jsonUrl is required' });
    }

    const result = await examManager.importExamFromJson(
      { userId: req.user!.userId, role: req.user!.role },
      courseId,
      examData as any,
      jsonUrl
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
    console.error('Failed to import exam:', error);
    res.status(500).json({ message: error.message || 'Failed to import exam from JSON' });
  }
});

/**
 * PUT /:id - Update exam (name, description, dates, etc.)
 */
router.put('/:id', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateExamSchema.parse(req.body);

    const result = await examManager.updateExam(
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
    console.error('Failed to update exam:', error);
    res.status(500).json({ message: error.message || 'Failed to update exam' });
  }
});

/**
 * DELETE /:id - Delete exam
 */
router.delete('/:id', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await examManager.deleteExam(
      { userId: req.user!.userId, role: req.user!.role },
      id
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json({ message: 'Exam deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete exam:', error);
    res.status(500).json({ message: error.message || 'Failed to delete exam' });
  }
});

/**
 * POST /:id/questions - Add question to exam
 */
router.post('/:id/questions', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = createExamQuestionSchema.parse({ ...req.body, examId: id });
    const { allowBonus } = req.body;

    const result = await examManager.addQuestion(
      { userId: req.user!.userId, role: req.user!.role },
      id,
      data,
      allowBonus
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
    console.error('Failed to add question:', error);
    res.status(500).json({ message: error.message || 'Failed to add question' });
  }
});

/**
 * PUT /:id/questions/:questionId - Update question
 */
router.put('/:id/questions/:questionId', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id, questionId } = req.params;
    const data = updateExamQuestionSchema.parse(req.body);
    const { allowBonus } = req.body;

    const result = await examManager.updateQuestion(
      { userId: req.user!.userId, role: req.user!.role },
      id,
      questionId,
      data,
      allowBonus
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
    console.error('Failed to update question:', error);
    res.status(500).json({ message: error.message || 'Failed to update question' });
  }
});

/**
 * DELETE /:id/questions/:questionId - Delete question
 */
router.delete('/:id/questions/:questionId', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id, questionId } = req.params;

    const result = await examManager.deleteQuestion(
      { userId: req.user!.userId, role: req.user!.role },
      id,
      questionId
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json({ message: 'Question deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete question:', error);
    res.status(500).json({ message: error.message || 'Failed to delete question' });
  }
});

/**
 * PATCH /:id/reorder-questions - Move a question to a new position
 */
router.patch('/:id/reorder-questions', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { questionId, newPosition } = req.body;

    if (!questionId || newPosition === undefined) {
      return res.status(400).json({ message: 'questionId and newPosition are required' });
    }

    const result = await examManager.reorderQuestion(
      { userId: req.user!.userId, role: req.user!.role },
      id,
      questionId,
      newPosition
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to reorder question:', error);
    res.status(500).json({ message: error.message || 'Failed to reorder question' });
  }
});

/**
 * GET /:id/attempts - Get all attempts for an exam (Teacher/Admin)
 */
router.get('/:id/attempts', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await examManager.getExamAttempts(
      { userId: req.user!.userId, role: req.user!.role },
      id
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch attempts:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch attempts' });
  }
});

/**
 * POST /:id/attempt/:attemptId/grade - Grade exam attempt
 */
router.post('/:id/attempt/:attemptId/grade', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id, attemptId } = req.params;
    const data = gradeExamAttemptSchema.parse(req.body);

    const result = await examManager.gradeExamAttempt(
      { userId: req.user!.userId, role: req.user!.role },
      id,
      attemptId,
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
    console.error('Failed to grade exam attempt:', error);
    res.status(500).json({ message: error.message || 'Failed to grade exam attempt' });
  }
});

/**
 * PATCH /:id/attempt/:attemptId - Update exam attempt score with bonus
 */
router.patch('/:id/attempt/:attemptId', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id, attemptId } = req.params;
    const data = updateExamAttemptScoreSchema.parse(req.body);

    const result = await examManager.updateExamAttemptScore(
      { userId: req.user!.userId, role: req.user!.role },
      id,
      attemptId,
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
    console.error('Failed to update exam score:', error);
    res.status(500).json({ message: error.message || 'Failed to update exam score' });
  }
});

/**
 * POST /:id/attempt - Submit exam attempt
 */
router.post('/:id/attempt', authenticate, authorize('STUDENT', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = submitExamAttemptSchema.parse(req.body);

    const result = await examManager.submitExamAttempt(
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
    console.error('Failed to submit exam:', error);
    res.status(500).json({ message: error.message || 'Failed to submit exam' });
  }
});

export default router;
