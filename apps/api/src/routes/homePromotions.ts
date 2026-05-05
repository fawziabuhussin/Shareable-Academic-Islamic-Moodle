import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { authenticate, AuthRequest } from '../middleware/auth';
import { homePromotionManager } from '../managers/homePromotion.manager';
import {
  createHomePromotionSchema,
  updateHomePromotionSchema,
} from '../schemas/homePromotion.schema';

const router = express.Router();

const promotionImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|jpg|pjpeg|png|webp|gif)$/i.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('يُسمح بصور JPEG أو PNG أو WebP أو GIF فقط'));
    }
  },
});

function extFromMime(mimetype: string): string {
  if (/png/i.test(mimetype)) return 'png';
  if (/webp/i.test(mimetype)) return 'webp';
  if (/gif/i.test(mimetype)) return 'gif';
  return 'jpg';
}

/**
 * POST /upload-image — Admin: upload announcement image (local disk or Vercel Blob).
 */
router.post(
  '/upload-image',
  authenticate,
  (req, res, next) => {
    promotionImageUpload.single('file')(req, res, (err: unknown) => {
      if (err) {
        const msg = err instanceof Error ? err.message : 'فشل الرفع';
        return res.status(400).json({ message: msg });
      }
      next();
    });
  },
  async (req: AuthRequest, res) => {
    try {
      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({ message: 'غير مسموح' });
      }
      const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
      if (!file?.buffer) {
        return res.status(400).json({ message: 'لم يُرفع ملف' });
      }

      const ext = extFromMime(file.mimetype);
      const filename = `${randomUUID()}.${ext}`;

      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { put } = await import('@vercel/blob');
        const blob = await put(`promotions/${filename}`, file.buffer, {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN,
          contentType: file.mimetype,
        });
        return res.json({ url: blob.url });
      }

      if (process.env.VERCEL === '1') {
        return res.status(501).json({
          message:
            'رفع الصور على الإنتاج يتطلب متغير BLOB_READ_WRITE_TOKEN (Vercel Blob). يمكنك استخدام رابط صورة مباشر.',
        });
      }

      const uploadDir = path.resolve(process.cwd(), '..', 'web', 'public', 'uploads', 'promotions');
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(path.join(uploadDir, filename), file.buffer);
      return res.json({ url: `/uploads/promotions/${filename}` });
    } catch (e: any) {
      console.error('promotion upload:', e);
      res.status(500).json({ message: e.message || 'فشل حفظ الصورة' });
    }
  }
);

/**
 * GET /public — Active promotions for the home page (no auth).
 */
router.get('/public', async (_req, res) => {
  try {
    const result = await homePromotionManager.listPublicVisible();
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.json(result.data ?? []);
  } catch (error: any) {
    console.error('home-promotions/public:', error);
    res.status(500).json({ message: error.message || 'فشل التحميل' });
  }
});

/**
 * GET /all — Full list for admin.
 */
router.get('/all', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await homePromotionManager.listAllAdmin({
      userId: req.user!.userId,
      role: req.user!.role,
    });
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.json(result.data ?? []);
  } catch (error: any) {
    console.error('home-promotions/all:', error);
    res.status(500).json({ message: error.message || 'فشل التحميل' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = createHomePromotionSchema.parse(req.body);
    const result = await homePromotionManager.create(
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
        message: 'خطأ في البيانات',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    console.error('home-promotions POST:', error);
    res.status(500).json({ message: error.message || 'فشل الإنشاء' });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateHomePromotionSchema.parse(req.body);
    const result = await homePromotionManager.update(
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
        message: 'خطأ في البيانات',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    console.error('home-promotions PUT:', error);
    res.status(500).json({ message: error.message || 'فشل التحديث' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await homePromotionManager.delete(
      { userId: req.user!.userId, role: req.user!.role },
      id
    );
    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }
    res.status(204).send();
  } catch (error: any) {
    console.error('home-promotions DELETE:', error);
    res.status(500).json({ message: error.message || 'فشل الحذف' });
  }
});

export default router;
