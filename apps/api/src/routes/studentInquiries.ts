import express from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { studentInquiryManager } from '../managers/studentInquiry.manager';
import {
  submitStudentInquirySchema,
  adminUpdateStudentInquirySchema,
} from '../schemas/studentInquiry.schema';

const router = express.Router();

router.post('/submit', async (req, res) => {
  try {
    const data = submitStudentInquirySchema.parse(req.body);
    const result = await studentInquiryManager.submit(data);
    res.status(201).json(result.data);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'تأكد من صحة الحقول',
        errors: error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    console.error('student-inquiries submit:', error);
    res.status(500).json({ message: 'تعذر إرسال الاستفسار' });
  }
});

router.get('/admin', authenticate, async (req: AuthRequest, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const result = await studentInquiryManager.listAdmin(
      { userId: req.user!.userId, role: req.user!.role },
      status
    );
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.json(result.data);
  } catch (e: any) {
    console.error('student-inquiries admin list:', e);
    res.status(500).json({ message: 'فشل التحميل' });
  }
});

router.get('/admin/new-count', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await studentInquiryManager.countNew({
      userId: req.user!.userId,
      role: req.user!.role,
    });
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.json(result.data);
  } catch (e: any) {
    console.error('student-inquiries new-count:', e);
    res.status(500).json({ message: 'فشل التحميل' });
  }
});

router.patch('/admin/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'غير مسموح' });
    }
    const { id } = req.params;
    const data = adminUpdateStudentInquirySchema.parse(req.body);
    const result = await studentInquiryManager.updateAdmin(
      { userId: req.user!.userId, role: req.user!.role },
      id,
      data
    );
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.json(result.data);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'خطأ في البيانات',
        errors: error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    console.error('student-inquiries admin patch:', error);
    res.status(500).json({ message: 'فشل التحديث' });
  }
});

export default router;
