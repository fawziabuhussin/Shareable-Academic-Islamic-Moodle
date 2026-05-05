/**
 * Grade Routes
 * HTTP layer - delegates to GradeManager
 */
import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { gradeManager } from '../managers/grade.manager';
import { overrideGradeSchema, manualGradeSchema } from '../schemas/grade.schema';

const router = express.Router();

/**
 * GET /all-courses — Get grades matrix across all courses (admin/teacher)
 * Admin sees all courses, teacher sees only their own courses.
 * Returns courses as columns + students as rows with effective scores.
 */
router.get('/all-courses', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await gradeManager.getAllCoursesGrades(
      { userId: req.user!.userId, role: req.user!.role }
    );
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch all-courses grades:', error);
    res.status(500).json({ message: error.message || 'فشل في جلب نظرة شاملة للدرجات' });
  }
});

/**
 * GET /student/:userId — Get student's grades summary across all courses
 * Returns per-course grades + calculated average (from finalized courses)
 * Students can only view their own. Admins can view any.
 * Supports pagination: ?page=1&limit=20
 */
router.get('/student/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const result = await gradeManager.getStudentGradesSummary(
      { userId: req.user!.userId, role: req.user!.role },
      userId
    );
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch student grades:', error);
    res.status(500).json({ message: error.message || 'فشل في جلب الدرجات' });
  }
});

/**
 * GET /course/:courseId — Get all students' grades for a course (teacher/admin)
 * Returns per-student breakdown with projected averages
 * Includes weight validation summary
 */
router.get('/course/:courseId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const result = await gradeManager.getTeacherCourseGrades(
      { userId: req.user!.userId, role: req.user!.role },
      courseId
    );
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch course grades:', error);
    res.status(500).json({ message: error.message || 'فشل في جلب درجات الدورة' });
  }
});

/**
 * GET /course/:courseId/student/:userId — Get a student's detailed breakdown for a course
 * Students can view their own. Teachers can view for their courses. Admins any.
 */
router.get('/course/:courseId/student/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { courseId, userId } = req.params;
    const result = await gradeManager.getStudentCourseBreakdown(
      { userId: req.user!.userId, role: req.user!.role },
      userId,
      courseId
    );
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch student course breakdown:', error);
    res.status(500).json({ message: error.message || 'فشل في جلب تفاصيل الدرجات' });
  }
});

/**
 * POST /course/:courseId/finalize — Finalize grades for all students in a course
 * Only course teacher or admin.
 * Validates weights sum to 100%. Computes and locks final scores.
 */
router.post('/course/:courseId/finalize', authenticate, async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const result = await gradeManager.finalizeCourseGrades(
      { userId: req.user!.userId, role: req.user!.role },
      courseId
    );
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to finalize grades:', error);
    res.status(500).json({ message: error.message || 'فشل في اعتماد الدرجات' });
  }
});

/**
 * POST /course/:courseId/student/:userId/finalize — Finalize grade for a single student
 * Only course teacher or admin. Validates weights sum to 100%.
 */
router.post('/course/:courseId/student/:userId/finalize', authenticate, async (req: AuthRequest, res) => {
  try {
    const { courseId, userId } = req.params;
    const result = await gradeManager.finalizeStudentGrade(
      { userId: req.user!.userId, role: req.user!.role },
      courseId,
      userId
    );
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to finalize student grade:', error);
    res.status(500).json({ message: error.message || 'فشل في اعتماد درجة الطالب' });
  }
});

/**
 * POST /course/:courseId/student/:userId/override — Override a student's final grade
 * Body: { overrideScore: number (0-100) }
 */
router.post('/course/:courseId/student/:userId/override', authenticate, async (req: AuthRequest, res) => {
  try {
    const { courseId, userId } = req.params;
    const parsed = overrideGradeSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: 'الدرجة يجب أن تكون بين 0 و 100' });
    }

    const { overrideScore } = parsed.data;

    const result = await gradeManager.overrideStudentGrade(
      { userId: req.user!.userId, role: req.user!.role },
      userId,
      courseId,
      overrideScore
    );
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to override grade:', error);
    res.status(500).json({ message: error.message || 'فشل في تعديل الدرجة' });
  }
});

/**
 * POST /course/:courseId/manual-grade — Insert a manual final grade for a student
 * Auto-enrolls the student if not already enrolled.
 * Body: { userId: string, score: number (0-100) }
 */
router.post('/course/:courseId/manual-grade', authenticate, async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const parsed = manualGradeSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: 'خطأ في التحقق',
        errors: parsed.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { userId, score } = parsed.data;

    const result = await gradeManager.insertManualGrade(
      { userId: req.user!.userId, role: req.user!.role },
      courseId,
      userId,
      score
    );
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to insert manual grade:', error);
    res.status(500).json({ message: error.message || 'فشل في إضافة الدرجة' });
  }
});

/**
 * POST /course/:courseId/reopen — Reopen grades for a course (clear finalization)
 * Only course teacher or admin.
 */
router.post('/course/:courseId/reopen', authenticate, async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const result = await gradeManager.reopenCourseGrades(
      { userId: req.user!.userId, role: req.user!.role },
      courseId
    );
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to reopen grades:', error);
    res.status(500).json({ message: error.message || 'فشل في إعادة فتح الدرجات' });
  }
});

export default router;
