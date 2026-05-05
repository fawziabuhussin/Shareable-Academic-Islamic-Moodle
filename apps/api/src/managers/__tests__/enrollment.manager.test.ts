import { enrollmentManager } from '../enrollment.manager';

jest.mock('../../repositories/enrollment.repository', () => ({
  enrollmentRepository: {
    exists: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../../utils/prisma', () => ({
  prisma: {
    course: {
      findUnique: jest.fn(),
    },
    coursePrerequisite: {
      findMany: jest.fn(),
    },
    grade: {
      findMany: jest.fn(),
    },
  },
}));

const mockAuth = { userId: 'user-1', role: 'STUDENT' as const };

describe('EnrollmentManager prerequisites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows enrollment when no prerequisites exist', async () => {
    const { prisma } = require('../../utils/prisma');
    const { enrollmentRepository } = require('../../repositories/enrollment.repository');

    prisma.course.findUnique.mockResolvedValue({ id: 'course-1', status: 'PUBLISHED' });
    prisma.coursePrerequisite.findMany.mockResolvedValue([]);
    enrollmentRepository.exists.mockResolvedValue(false);
    enrollmentRepository.create.mockResolvedValue({ id: 'enroll-1' });

    const result = await enrollmentManager.enrollInCourse(mockAuth, 'course-1');

    expect(result.success).toBe(true);
    expect(enrollmentRepository.create).toHaveBeenCalled();
  });

  it('blocks enrollment when prerequisites are missing', async () => {
    const { prisma } = require('../../utils/prisma');
    const { enrollmentRepository } = require('../../repositories/enrollment.repository');

    prisma.course.findUnique.mockResolvedValue({ id: 'course-1', status: 'PUBLISHED' });
    prisma.coursePrerequisite.findMany.mockResolvedValue([
      { prerequisite: { id: 'course-2', title: 'مساق سابق' } },
    ]);
    prisma.grade.findMany.mockResolvedValue([]);
    enrollmentRepository.exists.mockResolvedValue(false);

    const result = await enrollmentManager.enrollInCourse(mockAuth, 'course-1');

    expect(result.success).toBe(false);
    expect(result.error?.status).toBe(400);
    expect(result.error?.message).toContain('مساق سابق');
  });

  it('allows enrollment when prerequisites are passed', async () => {
    const { prisma } = require('../../utils/prisma');
    const { enrollmentRepository } = require('../../repositories/enrollment.repository');

    prisma.course.findUnique.mockResolvedValue({ id: 'course-1', status: 'PUBLISHED' });
    prisma.coursePrerequisite.findMany.mockResolvedValue([
      { prerequisite: { id: 'course-2', title: 'مساق سابق' } },
    ]);
    prisma.grade.findMany.mockResolvedValue([{ courseId: 'course-2', percentage: 75 }]);
    enrollmentRepository.exists.mockResolvedValue(false);
    enrollmentRepository.create.mockResolvedValue({ id: 'enroll-2' });

    const result = await enrollmentManager.enrollInCourse(mockAuth, 'course-1');

    expect(result.success).toBe(true);
    expect(enrollmentRepository.create).toHaveBeenCalled();
  });
});
