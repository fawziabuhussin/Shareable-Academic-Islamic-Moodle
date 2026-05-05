import { studentInquiryRepository } from '../repositories/studentInquiry.repository';
import { publicFaqEntryRepository } from '../repositories/publicFaqEntry.repository';
import type { SubmitStudentInquiryInput, AdminUpdateStudentInquiryInput } from '../schemas/studentInquiry.schema';
import type { AuthContext } from '../types/common.types';

function buildFaqQuestionFromInquiry(subject: string, body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= 400) return `${subject.trim()}\n\n${trimmed}`;
  return `${subject.trim()}\n\n${trimmed.slice(0, 400)}…`;
}

export class StudentInquiryManager {
  async submit(input: SubmitStudentInquiryInput) {
    const row = await studentInquiryRepository.create({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      subject: input.subject.trim(),
      body: input.body.trim(),
    });
    return { success: true as const, data: { id: row.id } };
  }

  async listAdmin(auth: AuthContext, status?: string) {
    if (auth.role !== 'ADMIN') {
      return { success: false as const, error: { status: 403, message: 'غير مسموح' } };
    }
    const list = await studentInquiryRepository.listAdmin(status ? { status } : undefined);
    return { success: true as const, data: list };
  }

  async countNew(auth: AuthContext) {
    if (auth.role !== 'ADMIN') {
      return { success: false as const, error: { status: 403, message: 'غير مسموح' } };
    }
    const count = await studentInquiryRepository.countByStatus('NEW');
    return { success: true as const, data: { count } };
  }

  async updateAdmin(auth: AuthContext, id: string, input: AdminUpdateStudentInquiryInput) {
    if (auth.role !== 'ADMIN') {
      return { success: false as const, error: { status: 403, message: 'غير مسموح' } };
    }
    const existing = await studentInquiryRepository.findById(id);
    if (!existing) {
      return { success: false as const, error: { status: 404, message: 'الاستفسار غير موجود' } };
    }

    const data: {
      status?: string;
      adminAnswerAr?: string | null;
      answeredAt?: Date | null;
    } = {};

    if (input.status !== undefined) data.status = input.status;
    if (input.adminAnswerAr !== undefined) data.adminAnswerAr = input.adminAnswerAr;

    if (input.adminAnswerAr !== undefined && input.adminAnswerAr && input.adminAnswerAr.trim()) {
      data.answeredAt = new Date();
      if (data.status === undefined) data.status = 'ANSWERED';
    }

    let updated = existing;
    if (Object.keys(data).length > 0) {
      updated = await studentInquiryRepository.update(id, data);
    }

    if (input.publishToFaq === true) {
      const answer = (updated.adminAnswerAr ?? '').trim();
      if (!answer) {
        return {
          success: false as const,
          error: { status: 400, message: 'أضف إجابة قبل النشر في الأسئلة الشائعة' },
        };
      }
      const questionAr = buildFaqQuestionFromInquiry(updated.subject, updated.body);
      await publicFaqEntryRepository.upsertForInquiry(id, questionAr, answer);
    } else if (input.publishToFaq === false) {
      await publicFaqEntryRepository.hideBySourceInquiryId(id);
    }

    const fresh = await studentInquiryRepository.findById(id);
    return { success: true as const, data: fresh };
  }
}

export const studentInquiryManager = new StudentInquiryManager();
