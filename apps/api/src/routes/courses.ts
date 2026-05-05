/**
 * Course Routes
 * HTTP layer - delegates to CourseManager
 */
import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { courseManager } from '../managers/course.manager';
import { createCourseSchema, updateCourseSchema, updateCourseWeightsSchema } from '../schemas/course.schema';
import { AuthContext } from '../types/common.types';
import { validateCourseWeights } from '../utils/grading';
import { prisma } from '../utils/prisma';

const router = express.Router();

/**
 * Helper to extract auth context from request (supports optional auth)
 */
function getAuthContext(req: any): AuthContext | null {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  if (token) {
    try {
      const { verifyAccessToken } = require('../utils/jwt');
      const payload = verifyAccessToken(token);
      return { userId: payload.userId, role: payload.role };
    } catch (e) {
      // Invalid token, continue as guest
      return null;
    }
  }
  
  return null;
}

/**
 * GET /admin - Get all courses for admin/teacher (includes DRAFT)
 * Supports pagination: ?page=1&limit=20
 * Without pagination params, returns array (backward compatible)
 */
router.get('/admin', authenticate, async (req: AuthRequest, res) => {
  try {
    const { page, limit, search, status, categoryId, teacherId, sortBy, sortOrder } = req.query;

    // Build filters from query params
    const filters: any = {};
    if (search) filters.search = search as string;
    if (status) filters.status = status as string;
    if (categoryId) filters.categoryId = categoryId as string;
    if (teacherId) filters.teacherId = teacherId as string;
    if (sortBy) filters.sortBy = sortBy as string;
    if (sortOrder) filters.sortOrder = sortOrder as string;

    // If pagination params provided, use paginated version
    if (page || limit) {
      const result = await courseManager.listAdminCourses(
        {
          userId: req.user!.userId,
          role: req.user!.role,
        },
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
    const result = await courseManager.listAdminCoursesUnpaginated({
      userId: req.user!.userId,
      role: req.user!.role,
    });

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch courses:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch courses' });
  }
});

/**
 * GET / - Get all courses (public/authenticated with filters)
 * Supports pagination: ?page=1&limit=20
 * Without pagination params, returns array (backward compatible)
 */
router.get('/', async (req, res) => {
  try {
    const auth = getAuthContext(req);
    const { categoryId, search, page, limit } = req.query;

    // If pagination params provided, use paginated version
    if (page || limit) {
      const result = await courseManager.listCourses(
        auth,
        {
          categoryId: categoryId as string,
          search: search as string,
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
    const result = await courseManager.listCoursesUnpaginated(auth, {
      categoryId: categoryId as string,
      search: search as string,
    });

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch courses:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch courses' });
  }
});

/**
 * GET /public - Get all published courses (public)
 * Returns paginated response: { data: [...], pagination: {...} }
 */
router.get('/public', async (req, res) => {
  try {
    const { categoryId, search, page, limit } = req.query;

    const result = await courseManager.listCourses(
      null,
      {
        categoryId: categoryId as string,
        search: search as string,
        status: 'PUBLISHED',
      },
      {
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 100, // Default high limit for public listing
      }
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch courses:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch courses' });
  }
});

/**
 * GET /teacher/my-courses - Get my courses (Teacher)
 */
router.get('/teacher/my-courses', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await courseManager.getMyCourses({
      userId: req.user!.userId,
      role: req.user!.role,
    });

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch courses:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch courses' });
  }
});

/**
 * GET /:id/weight-summary — Get the weight allocation summary for a course
 * Returns all assessments with their weights, reading weight, total, and validation
 */
router.get('/:id/weight-summary', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    // Fetch course + all assessments
    const [course, exams, homeworks, quizzes] = await Promise.all([
      prisma.course.findUnique({ where: { id }, select: { id: true, readingWeight: true, teacherId: true } }),
      prisma.exam.findMany({ where: { courseId: id }, select: { id: true, title: true, weightPercent: true }, orderBy: { createdAt: 'asc' } }),
      prisma.homework.findMany({ where: { courseId: id }, select: { id: true, title: true, weightPercent: true }, orderBy: { createdAt: 'asc' } }),
      prisma.quiz.findMany({ where: { courseId: id }, select: { id: true, title: true, weightPercent: true }, orderBy: { createdAt: 'asc' } }),
    ]);

    if (!course) {
      return res.status(404).json({ message: 'الدورة غير موجودة' });
    }

    // Auth check
    const isTeacher = course.teacherId === req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';
    if (!isTeacher && !isAdmin) {
      return res.status(403).json({ message: 'غير مسموح بالوصول' });
    }

    const allAssessments = [
      ...exams.map(e => ({ ...e, type: 'EXAM' as const })),
      ...homeworks.map(h => ({ ...h, type: 'HOMEWORK' as const })),
      ...quizzes.map(q => ({ ...q, type: 'QUIZ' as const })),
    ];

    const validation = validateCourseWeights(course.readingWeight, allAssessments);

    res.json({
      readingWeight: course.readingWeight,
      assessments: allAssessments,
      total: validation.total,
      isValid: validation.isValid,
      remaining: validation.remaining,
    });
  } catch (error: any) {
    console.error('Failed to fetch weight summary:', error);
    res.status(500).json({ message: error.message || 'فشل في جلب ملخص الأوزان' });
  }
});

/**
 * PUT /:id/weights — Bulk update all weights for a course
 * Body: { readingWeight: number, assessments: [{id, type, weightPercent}] }
 * Validates total = 100%
 */
router.put('/:id/weights', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const parsed = updateCourseWeightsSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: 'readingWeight و assessments مطلوبان' });
    }

    const { readingWeight, assessments } = parsed.data;

    // Fetch course
    const course = await prisma.course.findUnique({ where: { id }, select: { teacherId: true } });
    if (!course) {
      return res.status(404).json({ message: 'الدورة غير موجودة' });
    }

    // Auth check
    const isTeacher = course.teacherId === req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';
    if (!isTeacher && !isAdmin) {
      return res.status(403).json({ message: 'غير مسموح بالوصول' });
    }

    // Validate total = 100%
    const validation = validateCourseWeights(readingWeight, assessments);
    if (!validation.isValid) {
      return res.status(400).json({
        message: `مجموع الأوزان يجب أن يساوي 100%. المجموع الحالي: ${validation.total.toFixed(1)}%`,
        total: validation.total,
        remaining: validation.remaining,
      });
    }

    // Update all weights in a transaction
    await prisma.$transaction(async (tx) => {
      // Update course reading weight
      await tx.course.update({
        where: { id },
        data: { readingWeight },
      });

      // Update each assessment's weight
      for (const assessment of assessments) {
        const { id: assessmentId, type, weightPercent } = assessment;
        switch (type) {
          case 'EXAM':
            await tx.exam.update({ where: { id: assessmentId }, data: { weightPercent } });
            break;
          case 'HOMEWORK':
            await tx.homework.update({ where: { id: assessmentId }, data: { weightPercent } });
            break;
          case 'QUIZ':
            await tx.quiz.update({ where: { id: assessmentId }, data: { weightPercent } });
            break;
        }
      }
    });

    res.json({ message: 'تم تحديث الأوزان بنجاح', total: 100 });
  } catch (error: any) {
    console.error('Failed to update weights:', error);
    res.status(500).json({ message: error.message || 'فشل في تحديث الأوزان' });
  }
});

/**
 * GET /:id - Get course by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const auth = getAuthContext(req);

    const result = await courseManager.getCourse(auth, id);

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch course:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch course' });
  }
});

/**
 * POST / - Create course (Teacher/Admin)
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = createCourseSchema.parse(req.body);

    const result = await courseManager.createCourse(
      { userId: req.user!.userId, role: req.user!.role },
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
    console.error('Failed to create course:', error);
    res.status(500).json({ message: error.message || 'Failed to create course' });
  }
});

/**
 * PUT /:id - Update course (Teacher of course or Admin)
 */
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateCourseSchema.parse(req.body);

    const result = await courseManager.updateCourse(
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
    console.error('Failed to update course:', error);
    res.status(500).json({ message: error.message || 'Failed to update course' });
  }
});

/**
 * DELETE /:id - Delete course (Teacher of course or Admin)
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await courseManager.deleteCourse(
      { userId: req.user!.userId, role: req.user!.role },
      id
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete course:', error);
    res.status(500).json({ message: error.message || 'Failed to delete course' });
  }
});

export default router;
