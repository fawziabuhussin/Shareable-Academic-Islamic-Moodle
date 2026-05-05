/**
 * Module Routes
 * HTTP layer - delegates to ModuleManager
 */
import express from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { moduleManager } from '../managers/module.manager';
import { createModuleSchema, updateModuleSchema } from '../schemas/module.schema';

const router = express.Router();

/**
 * POST / - Create module (Teacher/Admin)
 */
router.post('/', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const data = createModuleSchema.parse(req.body);
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ message: 'courseId is required' });
    }

    const result = await moduleManager.createModule(
      { userId: req.user!.userId, role: req.user!.role },
      courseId,
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
          path: e.path,
          message: e.message,
        })),
      });
    }
    console.error('Error creating module:', error);
    res.status(500).json({ message: error.message || 'Failed to create module' });
  }
});

/**
 * PUT /:id - Update module
 */
router.put('/:id', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateModuleSchema.parse(req.body);
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ message: 'courseId is required' });
    }

    const result = await moduleManager.updateModule(
      { userId: req.user!.userId, role: req.user!.role },
      courseId,
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
          path: e.path,
          message: e.message,
        })),
      });
    }
    console.error('Failed to update module:', error);
    res.status(500).json({ message: error.message || 'Failed to update module' });
  }
});

/**
 * DELETE /:id - Delete module
 */
router.delete('/:id', authenticate, authorize('TEACHER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    // courseId is optional in query; if not provided, the manager will look it up
    const courseId = typeof req.query.courseId === 'string' ? req.query.courseId : undefined;

    const result = await moduleManager.deleteModule(
      { userId: req.user!.userId, role: req.user!.role },
      id,
      courseId
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json({ message: 'Module deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete module:', error);
    res.status(500).json({ message: error.message || 'Failed to delete module' });
  }
});

export default router;
