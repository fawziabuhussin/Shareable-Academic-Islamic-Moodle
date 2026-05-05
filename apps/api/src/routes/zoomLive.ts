import express from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { zoomLiveManager } from '../managers/zoomLive.manager';
import { updateZoomLiveSettingsSchema } from '../schemas/zoomLive.schema';

const router = express.Router();

router.get('/public-status', async (_req, res) => {
  try {
    const result = await zoomLiveManager.getPublicStatus();
    res.json(result.data);
  } catch (e: any) {
    console.error('zoom-live public-status:', e);
    res.status(500).json({ message: e.message || 'فشل التحميل' });
  }
});

router.get('/admin/settings', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await zoomLiveManager.getAdminSettings({
      userId: req.user!.userId,
      role: req.user!.role,
    });
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.json(result.data);
  } catch (e: any) {
    console.error('zoom-live admin get:', e);
    res.status(500).json({ message: e.message || 'فشل التحميل' });
  }
});

router.put('/admin/settings', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'غير مسموح' });
    }
    const data = updateZoomLiveSettingsSchema.parse(req.body);
    const result = await zoomLiveManager.updateAdminSettings(
      { userId: req.user!.userId, role: req.user!.role },
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
    console.error('zoom-live admin put:', error);
    res.status(500).json({ message: 'فشل الحفظ' });
  }
});

export default router;
