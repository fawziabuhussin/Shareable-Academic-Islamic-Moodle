import request from 'supertest';
import express from 'express';
import resourcesRouter from '../resources';

jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { userId: 'user-1', role: 'ADMIN' };
    next();
  }),
}));

jest.mock('../../managers/resource.manager', () => ({
  resourceManager: {
    listResources: jest.fn(),
    getResource: jest.fn(),
    createResource: jest.fn(),
    updateResource: jest.fn(),
    deleteResource: jest.fn(),
  },
}));

const buildApp = (mountPath: string) => {
  const app = express();
  app.use(express.json());
  app.use(mountPath, resourcesRouter);
  return app;
};

describe('Resources API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when missing courseId or lessonId', async () => {
    const app = buildApp('/resources');

    const response = await request(app).get('/resources');

    expect(response.status).toBe(400);
  });

  it('returns resource list for course parent', async () => {
    const app = buildApp('/courses/:courseId/resources');
    const { resourceManager } = require('../../managers/resource.manager');
    resourceManager.listResources.mockResolvedValue({ success: true, data: [] });

    const response = await request(app).get('/courses/course-1/resources');

    expect(response.status).toBe(200);
    expect(resourceManager.listResources).toHaveBeenCalled();
  });

  it('validates create payload', async () => {
    const app = buildApp('/courses/:courseId/resources');

    const response = await request(app)
      .post('/courses/course-1/resources')
      .send({ title: 'Resource', url: 'not-a-url' });

    expect(response.status).toBe(400);
  });

  it('creates a resource with valid data', async () => {
    const app = buildApp('/courses/:courseId/resources');
    const { resourceManager } = require('../../managers/resource.manager');
    resourceManager.createResource.mockResolvedValue({
      success: true,
      data: { id: 'res-1', title: 'Resource', url: 'https://example.com' },
    });

    const response = await request(app)
      .post('/courses/course-1/resources')
      .send({ title: 'Resource', url: 'https://example.com' });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe('res-1');
  });
});
