import { prisma } from '../utils/prisma';
import type { Prisma, PublicFaqEntry } from '@prisma/client';

export const publicFaqEntryRepository = {
  async listPublicVisible(): Promise<PublicFaqEntry[]> {
    return prisma.publicFaqEntry.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  },

  async listAdmin(): Promise<PublicFaqEntry[]> {
    return prisma.publicFaqEntry.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { sourceInquiry: { select: { id: true, email: true, subject: true } } },
    });
  },

  async findById(id: string) {
    return prisma.publicFaqEntry.findUnique({
      where: { id },
      include: { sourceInquiry: true },
    });
  },

  async create(data: {
    questionAr: string;
    answerAr: string;
    sortOrder?: number;
    isVisible?: boolean;
    sourceInquiryId?: string | null;
  }): Promise<PublicFaqEntry> {
    return prisma.publicFaqEntry.create({ data });
  },

  async update(
    id: string,
    data: {
      questionAr?: string;
      answerAr?: string;
      sortOrder?: number;
      isVisible?: boolean;
    }
  ): Promise<PublicFaqEntry> {
    return prisma.publicFaqEntry.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    await prisma.publicFaqEntry.delete({ where: { id } });
  },

  async maxSortOrder(): Promise<number> {
    const row = await prisma.publicFaqEntry.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return row?.sortOrder ?? 0;
  },

  async upsertForInquiry(
    inquiryId: string,
    questionAr: string,
    answerAr: string
  ): Promise<PublicFaqEntry> {
    const existing = await prisma.publicFaqEntry.findUnique({
      where: { sourceInquiryId: inquiryId },
    });
    if (existing) {
      return prisma.publicFaqEntry.update({
        where: { id: existing.id },
        data: { questionAr, answerAr, isVisible: true },
      });
    }
    const sortOrder = (await this.maxSortOrder()) + 1;
    return prisma.publicFaqEntry.create({
      data: {
        questionAr,
        answerAr,
        sortOrder,
        isVisible: true,
        sourceInquiryId: inquiryId,
      },
    });
  },

  async hideBySourceInquiryId(inquiryId: string): Promise<void> {
    await prisma.publicFaqEntry.updateMany({
      where: { sourceInquiryId: inquiryId },
      data: { isVisible: false },
    });
  },
};
