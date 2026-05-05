/**
 * Category Routes
 * HTTP layer - delegates to CategoryManager
 */
import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { categoryManager } from '../managers/category.manager';
import { createCategorySchema, updateCategorySchema } from '../schemas/category.schema';

const router = express.Router();

/**
 * GET / - Get all categories (public)
 */
router.get('/', async (req, res) => {
  try {
    const result = await categoryManager.listCategories();

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch categories:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch categories' });
  }
});

/**
 * POST / - Create category (Admin only)
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = createCategorySchema.parse(req.body);

    const result = await categoryManager.createCategory(
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
    console.error('Failed to create category:', error);
    res.status(500).json({ message: error.message || 'Failed to create category' });
  }
});

/**
 * PUT /:id - Update category (Admin only)
 */
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateCategorySchema.parse(req.body);

    const result = await categoryManager.updateCategory(
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
    console.error('Failed to update category:', error);
    res.status(500).json({ message: error.message || 'Failed to update category' });
  }
});

/**
 * DELETE /:id - Delete category (Admin only)
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await categoryManager.deleteCategory(
      { userId: req.user!.userId, role: req.user!.role },
      id
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete category:', error);
    res.status(500).json({ message: error.message || 'Failed to delete category' });
  }
});

export default router;
