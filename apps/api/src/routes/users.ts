/**
 * User Routes
 * HTTP layer - delegates to UserManager
 */
import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { userManager } from '../managers/user.manager';
import { oldGradeManager } from '../managers/oldGrade.manager';
import { createUserSchema, createTeacherSchema, updateUserSchema, updateSelfProfileSchema, changePasswordSchema } from '../schemas/user.schema';

const router = express.Router();

/**
 * GET /users - List all users (Admin only)
 * Supports pagination: ?page=1&limit=20
 * Without pagination params, returns array (backward compatible)
 */
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { page, limit, search, role, gender, blocked, sortBy, sortOrder } = req.query;

    // Build filters from query params
    const filters: any = {};
    if (search) filters.search = search as string;
    if (role) filters.role = role as string;
    if (gender) filters.gender = gender as string;
    if (blocked !== undefined && blocked !== '') filters.blocked = blocked as string;
    if (sortBy) filters.sortBy = sortBy as string;
    if (sortOrder) filters.sortOrder = sortOrder as string;

    // If pagination params provided, use paginated version
    if (page || limit) {
      const result = await userManager.listUsers(
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
    const result = await userManager.listUsersUnpaginated({
      userId: req.user!.userId,
      role: req.user!.role,
    });

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch users' });
  }
});

/**
 * GET /users/search - Search students by name, email, or idNumber (Admin/Teacher)
 */
router.get('/search', authenticate, async (req: AuthRequest, res) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (q.length < 2) {
      return res.status(400).json({ message: 'يجب أن يكون البحث حرفين على الأقل' });
    }

    const result = await userManager.searchStudents(
      { userId: req.user!.userId, role: req.user!.role },
      q
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to search students:', error);
    res.status(500).json({ message: error.message || 'فشل في البحث عن الطلاب' });
  }
});

/**
 * GET /users/search-for-course - Search students excluding those enrolled in a course (Admin/Teacher)
 * Query params: courseId (required), q (optional, min 2 chars if provided)
 * When q is omitted, returns default suggestions (non-enrolled students)
 */
router.get('/search-for-course', authenticate, async (req: AuthRequest, res) => {
  try {
    const courseId = (req.query.courseId as string || '').trim();
    if (!courseId) {
      return res.status(400).json({ message: 'معرّف الدورة مطلوب' });
    }

    const q = (req.query.q as string || '').trim();
    if (q.length > 0 && q.length < 2) {
      return res.status(400).json({ message: 'يجب أن يكون البحث حرفين على الأقل' });
    }

    const result = await userManager.searchStudentsForCourse(
      { userId: req.user!.userId, role: req.user!.role },
      courseId,
      q || null
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to search students for course:', error);
    res.status(500).json({ message: error.message || 'فشل في البحث عن الطلاب' });
  }
});

/**
 * GET /users/teachers - List teachers and admins for assignment (Admin only)
 */
router.get('/teachers', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await userManager.listTeachers({
      userId: req.user!.userId,
      role: req.user!.role,
    });

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch teachers:', error);
    res.status(500).json({ message: error.message || 'فشل في جلب قائمة المدرسين' });
  }
});

/**
 * POST /users - Create user (Admin only)
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = createUserSchema.parse(req.body);

    const result = await userManager.createUser(
      { userId: req.user!.userId, role: req.user!.role },
      data
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.status(201).json({ message: 'تم إنشاء المستخدم بنجاح', user: result.data });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'خطأ في التحقق',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    console.error('Failed to create user:', error);
    res.status(500).json({ message: error.message || 'فشل إنشاء المستخدم' });
  }
});

/**
 * POST /users/teachers - Create teacher (Admin only)
 */
router.post('/teachers', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = createTeacherSchema.parse(req.body);

    const result = await userManager.createTeacher(
      { userId: req.user!.userId, role: req.user!.role },
      data
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.status(201).json({ message: 'Teacher created successfully', user: result.data });
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
    console.error('Failed to create teacher:', error);
    res.status(500).json({ message: error.message || 'Failed to create teacher' });
  }
});

/**
 * PUT /users/me/profile - Update own profile (authenticated user)
 */
router.put('/me/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = updateSelfProfileSchema.parse(req.body);

    const result = await userManager.updateSelfProfile(
      { userId: req.user!.userId, role: req.user!.role },
      data
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json({ message: 'تم تحديث الملف الشخصي بنجاح', user: result.data });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'خطأ في التحقق',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    console.error('Failed to update profile:', error);
    res.status(500).json({ message: error.message || 'فشل تحديث الملف الشخصي' });
  }
});

/**
 * PUT /users/me/password - Change own password (authenticated user)
 */
router.put('/me/password', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = changePasswordSchema.parse(req.body);

    const result = await userManager.changePassword(
      { userId: req.user!.userId, role: req.user!.role },
      data.currentPassword,
      data.newPassword
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'خطأ في التحقق',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    console.error('Failed to change password:', error);
    res.status(500).json({ message: error.message || 'فشل تغيير كلمة المرور' });
  }
});

/**
 * PUT /users/:id - Update user (Admin or self with limited fields)
 */
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    const result = await userManager.updateUser(
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
    console.error('Failed to update user:', error);
    res.status(500).json({ message: error.message || 'Failed to update user' });
  }
});

/**
 * GET /users/:id/old-grades-sync - Check old grades sync status (Admin only)
 */
router.get('/:id/old-grades-sync', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.params;
    const result = await oldGradeManager.checkOldGradesSync(id);
    res.json(result);
  } catch (error: any) {
    console.error('Failed to check old grades sync:', error);
    res.status(500).json({ message: error.message || 'Failed to check old grades sync' });
  }
});

/**
 * POST /users/:id/old-grades-sync - Sync a single old grade (Admin only)
 */
router.post('/:id/old-grades-sync', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.params;
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ message: 'courseId is required' });
    }

    const result = await oldGradeManager.syncSingleOldGrade(id, courseId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Failed to sync old grade:', error);
    res.status(500).json({ message: error.message || 'Failed to sync old grade' });
  }
});

/**
 * GET /users/:id/profile - Get user profile (Admin or self)
 */
router.get('/:id/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await userManager.getUserProfile(
      { userId: req.user!.userId, role: req.user!.role },
      id
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch user profile:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch user profile' });
  }
});

/**
 * DELETE /users/:id - Delete user (Admin only)
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await userManager.deleteUser(
      { userId: req.user!.userId, role: req.user!.role },
      id
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete user:', error);
    res.status(500).json({ message: error.message || 'Failed to delete user' });
  }
});

export default router;
