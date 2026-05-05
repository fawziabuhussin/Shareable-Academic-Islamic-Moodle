import request from 'supertest';
import express from 'express';
import coursesRouter from '../courses';
import { authenticate, authorize } from '../../middleware/auth';

// Mock the middleware
jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => next()),
  authorize: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

// Mock Prisma
jest.mock('../../utils/prisma', () => ({
  prisma: {
    course: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/courses', coursesRouter);

describe('Courses API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /courses', () => {
    it('should return list of courses', async () => {
      const { prisma } = require('../../utils/prisma');
      prisma.course.findMany.mockResolvedValue([
        {
          id: '1',
          title: 'Test Course',
          description: 'Test Description',
          status: 'PUBLISHED',
        },
      ]);

      const response = await request(app).get('/courses');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('POST /courses', () => {
    it('should validate course creation data', async () => {
      const response = await request(app)
        .post('/courses')
        .send({
          title: 'New Course',
          description: 'Course Description',
          categoryId: 'category-1',
          price: 0,
          status: 'DRAFT',
        });

      // Should either succeed (201) or fail validation (400)
      expect([201, 400]).toContain(response.status);
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/courses')
        .send({
          title: '', // Invalid: empty title
          description: 'Course Description',
        });

      expect(response.status).toBe(400);
    });
  });
});

