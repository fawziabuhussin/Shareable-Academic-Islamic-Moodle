import express from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { publicFaqManager } from '../managers/publicFaq.manager';
import { createPublicFaqSchema, updatePublicFaqSchema } from '../schemas/publicFaq.schema';

const router = express.Router();

router.get('/public', async (_req, res) => {
  try {
    const result = await publicFaqManager.listPublic();
    res.json(result.data ?? []);
  } catch (e: any) {
    console.error('public-faq public:', e);
    res.status(500).json({ message: e.message || 'فشل التحميل' });
  }
});

router.get('/admin/all', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await publicFaqManager.listAdmin({
      userId: req.user!.userId,
      role: req.user!.role,
    });
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.json(result.data ?? []);
  } catch (e: any) {
    console.error('public-faq admin list:', e);
    res.status(500).json({ message: 'فشل التحميل' });
  }
});

router.post('/admin', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'غير مسموح' });
    }
    const data = createPublicFaqSchema.parse(req.body);
    const result = await publicFaqManager.createAdmin(
      { userId: req.user!.userId, role: req.user!.role },
      data
    );
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.status(201).json(result.data);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'خطأ في البيانات',
        errors: error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    console.error('public-faq admin post:', error);
    res.status(500).json({ message: 'فشل الإنشاء' });
  }
});

router.put('/admin/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'غير مسموح' });
    }
    const { id } = req.params;
    const data = updatePublicFaqSchema.parse(req.body);
    const result = await publicFaqManager.updateAdmin(
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
    console.error('public-faq admin put:', error);
    res.status(500).json({ message: 'فشل التحديث' });
  }
});

router.delete('/admin/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'غير مسموح' });
    }
    const { id } = req.params;
    const result = await publicFaqManager.deleteAdmin(
      { userId: req.user!.userId, role: req.user!.role },
      id
    );
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.status(204).send();
  } catch (e: any) {
    console.error('public-faq admin delete:', e);
    res.status(500).json({ message: 'فشل الحذف' });
  }
});

export default router;
