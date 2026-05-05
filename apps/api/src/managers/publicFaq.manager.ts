import { publicFaqEntryRepository } from '../repositories/publicFaqEntry.repository';
import type { AuthContext } from '../types/common.types';
import type { z } from 'zod';
import type { createPublicFaqSchema, updatePublicFaqSchema } from '../schemas/publicFaq.schema';

type CreateInput = z.infer<typeof createPublicFaqSchema>;
type UpdateInput = z.infer<typeof updatePublicFaqSchema>;

export class PublicFaqManager {
  async listPublic() {
    const list = await publicFaqEntryRepository.listPublicVisible();
    return { success: true as const, data: list };
  }

  async listAdmin(auth: AuthContext) {
    if (auth.role !== 'ADMIN') {
      return { success: false as const, error: { status: 403, message: 'غير مسموح' } };
    }
    const list = await publicFaqEntryRepository.listAdmin();
    return { success: true as const, data: list };
  }

  async createAdmin(auth: AuthContext, input: CreateInput) {
    if (auth.role !== 'ADMIN') {
      return { success: false as const, error: { status: 403, message: 'غير مسموح' } };
    }
    let sortOrder = input.sortOrder;
    if (sortOrder === undefined) {
      sortOrder = (await publicFaqEntryRepository.maxSortOrder()) + 1;
    }
    const row = await publicFaqEntryRepository.create({
      questionAr: input.questionAr.trim(),
      answerAr: input.answerAr.trim(),
      sortOrder,
      isVisible: input.isVisible ?? true,
      sourceInquiryId: null,
    });
    return { success: true as const, data: row };
  }

  async updateAdmin(auth: AuthContext, id: string, input: UpdateInput) {
    if (auth.role !== 'ADMIN') {
      return { success: false as const, error: { status: 403, message: 'غير مسموح' } };
    }
    const existing = await publicFaqEntryRepository.findById(id);
    if (!existing) {
      return { success: false as const, error: { status: 404, message: 'غير موجود' } };
    }
    const data: UpdateInput = {};
    if (input.questionAr !== undefined) data.questionAr = input.questionAr.trim();
    if (input.answerAr !== undefined) data.answerAr = input.answerAr.trim();
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.isVisible !== undefined) data.isVisible = input.isVisible;
    const row = await publicFaqEntryRepository.update(id, data);
    return { success: true as const, data: row };
  }

  async deleteAdmin(auth: AuthContext, id: string) {
    if (auth.role !== 'ADMIN') {
      return { success: false as const, error: { status: 403, message: 'غير مسموح' } };
    }
    const existing = await publicFaqEntryRepository.findById(id);
    if (!existing) {
      return { success: false as const, error: { status: 404, message: 'غير موجود' } };
    }
    await publicFaqEntryRepository.delete(id);
    return { success: true as const };
  }
}

export const publicFaqManager = new PublicFaqManager();
