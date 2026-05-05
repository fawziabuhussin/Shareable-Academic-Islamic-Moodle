/**
 * Enrollment Routes
 * HTTP layer - delegates to EnrollmentManager
 */
import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { enrollmentManager } from '../managers/enrollment.manager';
import { createEnrollmentSchema } from '../schemas/enrollment.schema';

const router = express.Router();

/**
 * GET / - List all enrollments (Admin only)
 * Supports pagination: ?page=1&limit=20
 * Without pagination params, returns array (backward compatible)
 */
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { page, limit, search, userId, courseId, status } = req.query;

    const filters: {
      search?: string;
      userId?: string;
      courseId?: string;
      status?: string;
    } = {};
    const s = typeof search === 'string' ? search.trim() : '';
    if (s) filters.search = s;
    const uid = typeof userId === 'string' ? userId.trim() : '';
    if (uid) filters.userId = uid;
    const cid = typeof courseId === 'string' ? courseId.trim() : '';
    if (cid) filters.courseId = cid;
    const st = typeof status === 'string' ? status.trim() : '';
    if (st) filters.status = st;

    // If pagination params provided, use paginated version
    if (page || limit) {
      const result = await enrollmentManager.listAllEnrollments(
        {
          userId: req.user!.userId,
          role: req.user!.role,
        },
        {
          page: parseInt(page as string) || 1,
          limit: parseInt(limit as string) || 20,
        },
        Object.keys(filters).length > 0 ? filters : undefined
      );

      if (!result.success) {
        return res.status(result.error!.status).json({ message: result.error!.message });
      }

      return res.json(result.data);
    }

    // Default: unpaginated for backward compatibility
    const result = await enrollmentManager.listAllEnrollmentsUnpaginated({
      userId: req.user!.userId,
      role: req.user!.role,
    });

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch all enrollments:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch enrollments' });
  }
});

/**
 * POST / - Enroll in course (Student/Admin)
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { courseId } = createEnrollmentSchema.parse(req.body);

    const result = await enrollmentManager.enrollInCourse(
      { userId: req.user!.userId, role: req.user!.role },
      courseId
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
    console.error('Failed to enroll:', error);
    res.status(500).json({ message: error.message || 'Failed to enroll' });
  }
});

/**
 * GET /my-enrollments - Get my enrollments (Student/Admin)
 * Supports pagination: ?page=1&limit=20
 */
router.get('/my-enrollments', authenticate, async (req: AuthRequest, res) => {
  try {
    const { page, limit } = req.query;
    
    // If pagination params provided, use paginated version
    if (page || limit) {
      const result = await enrollmentManager.getMyEnrollmentsPaginated(
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
    const result = await enrollmentManager.getMyEnrollments({
      userId: req.user!.userId,
      role: req.user!.role,
    });

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch enrollments:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch enrollments' });
  }
});

/**
 * GET /course/:courseId - Get enrollments for a course (Teacher/Admin)
 */
router.get('/course/:courseId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;

    const result = await enrollmentManager.getCourseEnrollments(
      { userId: req.user!.userId, role: req.user!.role },
      courseId
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch enrollments:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch enrollments' });
  }
});

/**
 * DELETE /:id - Delete/Cancel enrollment
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await enrollmentManager.deleteEnrollment(
      { userId: req.user!.userId, role: req.user!.role },
      id
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json({ message: 'Enrollment deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete enrollment:', error);
    res.status(500).json({ message: error.message || 'Failed to delete enrollment' });
  }
});

export default router;
