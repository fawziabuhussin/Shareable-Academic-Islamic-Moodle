import { prisma } from '../utils/prisma';
import type { Prisma, StudentInquiry } from '@prisma/client';

export const studentInquiryRepository = {
  async create(data: {
    name: string;
    email: string;
    phone?: string | null;
    subject: string;
    body: string;
  }): Promise<StudentInquiry> {
    return prisma.studentInquiry.create({ data });
  },

  async findById(id: string): Promise<StudentInquiry | null> {
    return prisma.studentInquiry.findUnique({
      where: { id },
      include: { publishedFaq: true },
    });
  },

  async listAdmin(params?: { status?: string }): Promise<StudentInquiry[]> {
    const where: Prisma.StudentInquiryWhereInput = {};
    if (params?.status) where.status = params.status;
    return prisma.studentInquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { publishedFaq: true },
    });
  },

  async update(
    id: string,
    data: {
      status?: string;
      adminAnswerAr?: string | null;
      answeredAt?: Date | null;
    }
  ): Promise<StudentInquiry> {
    return prisma.studentInquiry.update({ where: { id }, data });
  },

  async countByStatus(status: string): Promise<number> {
    return prisma.studentInquiry.count({ where: { status } });
  },
};
