/**
 * Homework Routes
 * HTTP layer - delegates to HomeworkManager
 */
import express from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { homeworkManager } from '../managers/homework.manager';
import {
  createHomeworkSchema,
  updateHomeworkSchema,
  submitHomeworkSchema,
  gradeHomeworkSchema,
} from '../schemas/homework.schema';

const router = express.Router();

/**
 * GET /course/:courseId - Get homeworks for a course
 * Supports pagination: ?page=1&limit=20
 * Without pagination params, returns array (backward compatible)
 */
router.get('/course/:courseId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const { page, limit } = req.query;

    // If pagination params provided, use paginated version
    if (page || limit) {
      const result = await homeworkManager.listHomework(
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
    const result = await homeworkManager.listHomeworkUnpaginated(
      { userId: req.user!.userId, role: req.user!.role },
      courseId
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch homeworks:', error);
    res.status(500).json({ message: error.message || 'فشل في جلب الواجبات' });
  }
});

/**
 * GET /:id - Get homework by ID
 */
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { courseId } = req.query;

    const result = await homeworkManager.getHomework(
      { userId: req.user!.userId, role: req.user!.role },
      id,
      typeof courseId === 'string' ? courseId : undefined
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch homework:', error);
    res.status(500).json({ message: error.message || 'فشل في جلب الواجب' });
  }
});

/**
 * POST / - Create homework (Teacher/Admin)
 */
router.post('/', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const validatedData = createHomeworkSchema.parse(req.body);
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ message: 'يرجى تحديد الدورة' });
    }

    // Convert to proper DTO format
    const data = {
      ...validatedData,
      dueDate: validatedData.dueDate instanceof Date ? validatedData.dueDate : new Date(validatedData.dueDate),
    };

    const result = await homeworkManager.createHomework(
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
        message: 'خطأ في البيانات المدخلة',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    console.error('Failed to create homework:', error);
    res.status(500).json({ message: error.message || 'فشل في إنشاء الواجب' });
  }
});

/**
 * PUT /:id - Update homework
 */
router.put('/:id', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateHomeworkSchema.parse(req.body);
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ message: 'يرجى تحديد الدورة' });
    }

    // Convert date if present
    const data: any = { ...validatedData };
    if (data.dueDate) {
      data.dueDate = data.dueDate instanceof Date ? data.dueDate : new Date(data.dueDate);
    }

    const result = await homeworkManager.updateHomework(
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
        message: 'خطأ في البيانات المدخلة',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    console.error('Failed to update homework:', error);
    res.status(500).json({ message: error.message || 'فشل في تحديث الواجب' });
  }
});

/**
 * DELETE /:id - Delete homework
 */
router.delete('/:id', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    // courseId is optional in query; if not provided, the manager will look it up
    const courseId = typeof req.query.courseId === 'string' ? req.query.courseId : undefined;

    const result = await homeworkManager.deleteHomework(
      { userId: req.user!.userId, role: req.user!.role },
      id,
      courseId
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json({ message: 'تم حذف الواجب بنجاح' });
  } catch (error: any) {
    console.error('Failed to delete homework:', error);
    res.status(500).json({ message: error.message || 'فشل في حذف الواجب' });
  }
});

/**
 * POST /:id/submit - Submit homework
 */
router.post('/:id/submit', authenticate, authorize('STUDENT', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = submitHomeworkSchema.parse(req.body);

    const result = await homeworkManager.submitHomework(
      { userId: req.user!.userId, role: req.user!.role },
      id,
      data
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.status(201).json(result.data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'خطأ في البيانات المدخلة',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    console.error('Failed to submit homework:', error);
    res.status(500).json({ message: error.message || 'فشل في تسليم الواجب' });
  }
});

/**
 * GET /:id/submissions - Get all submissions for a homework (Teacher/Admin)
 */
router.get('/:id/submissions', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { courseId } = req.query;

    if (!courseId || typeof courseId !== 'string') {
      return res.status(400).json({ message: 'يرجى تحديد الدورة' });
    }

    const result = await homeworkManager.getSubmissions(
      { userId: req.user!.userId, role: req.user!.role },
      courseId,
      id
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch submissions:', error);
    res.status(500).json({ message: error.message || 'فشل في جلب التسليمات' });
  }
});

/**
 * POST /:id/grade/:submissionId - Grade homework (Teacher/Admin)
 */
router.post('/:id/grade/:submissionId', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id, submissionId } = req.params;
    const { courseId } = req.body;
    const data = gradeHomeworkSchema.parse(req.body);

    if (!courseId) {
      return res.status(400).json({ message: 'يرجى تحديد الدورة' });
    }

    const result = await homeworkManager.gradeSubmission(
      { userId: req.user!.userId, role: req.user!.role },
      courseId,
      id,
      submissionId,
      data
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'خطأ في البيانات المدخلة',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    console.error('Failed to grade homework:', error);
    res.status(500).json({ message: error.message || 'فشل في تقييم الواجب' });
  }
});

export default router;
