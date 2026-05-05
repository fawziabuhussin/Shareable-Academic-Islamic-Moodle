/**
 * Questions API Routes - سؤال متعلق بالدرس
 */
import express from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { questionManager } from '../managers/question.manager';
import { createQuestionSchema, answerQuestionSchema } from '../schemas/question.schema';

const router = express.Router();

/**
 * POST /questions - Create a new question (students only)
 */
router.post('/', authenticate, authorize('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const validatedData = createQuestionSchema.parse(req.body);

    const result = await questionManager.createQuestion(
      { userId: req.user!.userId, role: req.user!.role },
      validatedData
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.status(201).json(result.data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'خطأ في البيانات',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    console.error('Error creating question:', error);
    res.status(500).json({ message: error.message || 'فشل إرسال السؤال' });
  }
});

/**
 * GET /questions - Get all questions (admin only)
 * Supports pagination: ?page=1&limit=20
 * Without pagination params, returns array (backward compatible)
 */
router.get('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { status, courseId, lessonId, page, limit } = req.query;

    const filters: any = {};
    if (status && typeof status === 'string') {
      filters.status = status;
    }
    if (courseId && typeof courseId === 'string') {
      filters.courseId = courseId;
    }
    if (lessonId && typeof lessonId === 'string') {
      filters.lessonId = lessonId;
    }

    // If pagination params provided, use paginated version
    if (page || limit) {
      const result = await questionManager.getAllQuestions(
        { userId: req.user!.userId, role: req.user!.role },
        filters,
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
    const result = await questionManager.getAllQuestionsUnpaginated(
      { userId: req.user!.userId, role: req.user!.role },
      filters
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ message: error.message || 'فشل تحميل الأسئلة' });
  }
});

/**
 * GET /questions/my - Get questions for the logged-in student
 * Supports pagination: ?page=1&limit=20
 * Without pagination params, returns array (backward compatible)
 */
router.get('/my', authenticate, authorize('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const { page, limit } = req.query;

    // If pagination params provided, use paginated version
    if (page || limit) {
      const result = await questionManager.getMyQuestions(
        { userId: req.user!.userId, role: req.user!.role },
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
    const result = await questionManager.getMyQuestionsUnpaginated({
      userId: req.user!.userId,
      role: req.user!.role,
    });

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Error fetching my questions:', error);
    res.status(500).json({ message: error.message || 'فشل تحميل أسئلتك' });
  }
});

/**
 * GET /questions/teacher - Get questions for courses taught by the teacher
 * Supports pagination: ?page=1&limit=20
 * Without pagination params, returns array (backward compatible)
 */
router.get('/teacher', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { status, courseId, page, limit } = req.query;

    const filters: any = {};
    if (status && typeof status === 'string') {
      filters.status = status;
    }
    if (courseId && typeof courseId === 'string') {
      filters.courseId = courseId;
    }

    // If pagination params provided, use paginated version
    if (page || limit) {
      const result = await questionManager.getTeacherQuestions(
        { userId: req.user!.userId, role: req.user!.role },
        filters,
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
    const result = await questionManager.getTeacherQuestionsUnpaginated(
      { userId: req.user!.userId, role: req.user!.role },
      filters
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Error fetching teacher questions:', error);
    res.status(500).json({ message: error.message || 'فشل تحميل الأسئلة' });
  }
});

/**
 * GET /questions/new-count - Get count of new/pending questions (for notifications)
 */
router.get('/new-count', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await questionManager.getNewQuestionsCount({
      userId: req.user!.userId,
      role: req.user!.role,
    });

    res.json(result.data);
  } catch (error: any) {
    console.error('Error fetching new questions count:', error);
    res.status(500).json({ message: error.message || 'فشل تحميل عدد الأسئلة الجديدة' });
  }
});

/**
 * POST /questions/:id/answer - Answer a question (teacher/admin only)
 */
router.post('/:id/answer', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validatedData = answerQuestionSchema.parse(req.body);

    const result = await questionManager.answerQuestion(
      { userId: req.user!.userId, role: req.user!.role },
      id,
      validatedData
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'خطأ في البيانات',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    console.error('Error answering question:', error);
    res.status(500).json({ message: error.message || 'فشل الإجابة على السؤال' });
  }
});

/**
 * DELETE /questions/:id - Delete a question
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await questionManager.deleteQuestion(
      { userId: req.user!.userId, role: req.user!.role },
      id
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json({ message: 'تم حذف السؤال بنجاح' });
  } catch (error: any) {
    console.error('Error deleting question:', error);
    res.status(500).json({ message: error.message || 'فشل حذف السؤال' });
  }
});

export default router;
