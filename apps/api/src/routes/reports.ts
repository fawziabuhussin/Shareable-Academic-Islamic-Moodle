/**
 * Report Routes
 * HTTP layer for content error reporting - تبليغ عن خطأ بالمادة
 */
import express from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { reportManager } from '../managers/report.manager';
import { createReportSchema, updateReportSchema } from '../schemas/report.schema';

const router = express.Router();

/**
 * POST / - Create a new report (Authenticated users)
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const validatedData = createReportSchema.parse(req.body);

    const result = await reportManager.createReport(
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
    console.error('Failed to create report:', error);
    res.status(500).json({ message: error.message || 'فشل إنشاء التبليغ' });
  }
});

/**
 * GET /my-reports - Get reports submitted by the current student (only their own)
 * Supports pagination: ?page=1&limit=20
 * Without pagination params, returns array (backward compatible)
 */
router.get('/my-reports', authenticate, authorize('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const { page, limit } = req.query;

    // If pagination params provided, use paginated version
    if (page || limit) {
      const result = await reportManager.getMyReportsPaginated(
        {
          userId: req.user!.userId,
          role: req.user!.role,
        },
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
    const result = await reportManager.getMyReports({
      userId: req.user!.userId,
      role: req.user!.role,
    });

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch my reports:', error);
    res.status(500).json({ message: error.message || 'فشل جلب التبليغات' });
  }
});

/**
 * GET /count/new - Get count of new reports (Admin/Teacher)
 */
router.get('/count/new', authenticate, authorize('ADMIN', 'TEACHER'), async (req: AuthRequest, res) => {
  try {
    const result = await reportManager.getNewCount({
      userId: req.user!.userId,
      role: req.user!.role,
    });

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch report count:', error);
    res.status(500).json({ message: error.message || 'فشل جلب عدد التبليغات' });
  }
});

/**
 * GET / - Get all reports (Admin/Teacher)
 * Supports pagination: ?page=1&limit=20
 * Without pagination params, returns array (backward compatible)
 */
router.get('/', authenticate, authorize('ADMIN', 'TEACHER'), async (req: AuthRequest, res) => {
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
      const result = await reportManager.getReportsPaginated(
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
    const result = await reportManager.getReports(
      { userId: req.user!.userId, role: req.user!.role },
      filters
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch reports:', error);
    res.status(500).json({ message: error.message || 'فشل جلب التبليغات' });
  }
});

/**
 * GET /:id - Get a single report
 */
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await reportManager.getReport(
      { userId: req.user!.userId, role: req.user!.role },
      id
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch report:', error);
    res.status(500).json({ message: error.message || 'فشل جلب التبليغ' });
  }
});

/**
 * PATCH /:id - Update report status (Admin/Teacher)
 */
router.patch('/:id', authenticate, authorize('ADMIN', 'TEACHER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateReportSchema.parse(req.body);

    const result = await reportManager.updateStatus(
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
    console.error('Failed to update report:', error);
    res.status(500).json({ message: error.message || 'فشل تحديث التبليغ' });
  }
});

/**
 * DELETE /:id - Delete a report (Admin, Teacher of the course, or the reporter/student who created it)
 */
router.delete('/:id', authenticate, authorize('ADMIN', 'TEACHER', 'STUDENT'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await reportManager.deleteReport(
      { userId: req.user!.userId, role: req.user!.role },
      id
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json({ message: 'تم حذف التبليغ بنجاح' });
  } catch (error: any) {
    console.error('Failed to delete report:', error);
    res.status(500).json({ message: error.message || 'فشل حذف التبليغ' });
  }
});

export default router;
