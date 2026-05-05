import express from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { siteContentManager } from '../managers/siteContent.manager';
import { updateSiteContentSettingsSchema } from '../schemas/siteContent.schema';

const router = express.Router();

router.get('/public', async (_req, res) => {
  try {
    const result = await siteContentManager.getPublic();
    res.json(result.data);
  } catch (e: any) {
    console.error('site-content public:', e);
    res.status(500).json({ message: e.message || 'فشل التحميل' });
  }
});

router.get('/admin/settings', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await siteContentManager.getAdmin({
      userId: req.user!.userId,
      role: req.user!.role,
    });
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.json(result.data);
  } catch (e: any) {
    console.error('site-content admin get:', e);
    res.status(500).json({ message: e.message || 'فشل التحميل' });
  }
});

router.put('/admin/settings', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'غير مسموح' });
    }
    const parsed = updateSiteContentSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'خطأ في البيانات',
        errors: parsed.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    const body = { ...parsed.data };
    if (body.mapsInfoUrl === '') body.mapsInfoUrl = null;
    const result = await siteContentManager.updateAdmin(
      { userId: req.user!.userId, role: req.user!.role },
      body
    );
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.json(result.data);
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: 'خطأ في البيانات' });
    }
    console.error('site-content admin put:', e);
    res.status(500).json({ message: 'فشل الحفظ' });
  }
});

export default router;
