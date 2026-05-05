/**
 * Resource Routes
 * HTTP layer for resource endpoints
 * Delegates business logic to ResourceManager
 */
import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { resourceManager } from '../managers/resource.manager';
import { createResourceSchema, updateResourceSchema } from '../schemas/resource.schema';
import { ParentInfo } from '../types/common.types';

// Use mergeParams to access parent route params (courseId or lessonId)
const router = express.Router({ mergeParams: true });

/**
 * Extract parent information from request parameters
 * @param req - Express request with courseId or lessonId params
 * @returns ParentInfo or null if neither param exists
 */
function getParentInfo(req: AuthRequest): ParentInfo | null {
  const { courseId, lessonId } = req.params;
  if (courseId) return { type: 'course', id: courseId };
  if (lessonId) return { type: 'lesson', id: lessonId };
  return null;
}

/**
 * GET / - List all resources for a course or lesson
 */
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const parent = getParentInfo(req);
    if (!parent) {
      return res.status(400).json({ message: 'Invalid request: missing courseId or lessonId' });
    }

    const result = await resourceManager.listResources(
      { userId: req.user!.userId, role: req.user!.role },
      parent
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch resources:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch resources' });
  }
});

/**
 * GET /:id - Get a single resource
 */
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const parent = getParentInfo(req);
    if (!parent) {
      return res.status(400).json({ message: 'Invalid request: missing courseId or lessonId' });
    }

    const result = await resourceManager.getResource(
      { userId: req.user!.userId, role: req.user!.role },
      parent,
      id
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Failed to fetch resource:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch resource' });
  }
});

/**
 * POST / - Create a new resource
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const parent = getParentInfo(req);
    if (!parent) {
      return res.status(400).json({ message: 'Invalid request: missing courseId or lessonId' });
    }

    const data = createResourceSchema.parse(req.body);

    const result = await resourceManager.createResource(
      { userId: req.user!.userId, role: req.user!.role },
      parent,
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
    console.error('Failed to create resource:', error);
    res.status(500).json({ message: error.message || 'Failed to create resource' });
  }
});

/**
 * PUT /:id - Update a resource
 */
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const parent = getParentInfo(req);
    if (!parent) {
      return res.status(400).json({ message: 'Invalid request: missing courseId or lessonId' });
    }

    const data = updateResourceSchema.parse(req.body);

    const result = await resourceManager.updateResource(
      { userId: req.user!.userId, role: req.user!.role },
      parent,
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
    console.error('Failed to update resource:', error);
    res.status(500).json({ message: error.message || 'Failed to update resource' });
  }
});

/**
 * DELETE /:id - Delete a resource
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const parent = getParentInfo(req);
    if (!parent) {
      return res.status(400).json({ message: 'Invalid request: missing courseId or lessonId' });
    }

    const result = await resourceManager.deleteResource(
      { userId: req.user!.userId, role: req.user!.role },
      parent,
      id
    );

    if (!result.success) {
      return res.status(result.error!.status).json({ message: result.error!.message });
    }

    res.json({ message: 'Resource deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete resource:', error);
    res.status(500).json({ message: error.message || 'Failed to delete resource' });
  }
});

export default router;
