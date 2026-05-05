import { homePromotionRepository } from '../repositories/homePromotion.repository';
import { AuthContext } from '../types/common.types';
import {
  CreateHomePromotionDTO,
  HomePromotionDTO,
  UpdateHomePromotionDTO,
} from '../types/homePromotion.types';

export interface HomePromotionListResult {
  success: boolean;
  data?: HomePromotionDTO[];
  error?: { status: number; message: string };
}

export interface HomePromotionResult {
  success: boolean;
  data?: HomePromotionDTO;
  error?: { status: number; message: string };
}

export interface DeleteResult {
  success: boolean;
  error?: { status: number; message: string };
}

export class HomePromotionManager {
  async listPublicVisible(): Promise<HomePromotionListResult> {
    const data = await homePromotionRepository.findVisiblePublic();
    return { success: true, data };
  }

  async listAllAdmin(auth: AuthContext): Promise<HomePromotionListResult> {
    if (auth.role !== 'ADMIN') {
      return { success: false, error: { status: 403, message: 'غير مسموح' } };
    }
    const data = await homePromotionRepository.findAllAdmin();
    return { success: true, data };
  }

  async create(auth: AuthContext, dto: CreateHomePromotionDTO): Promise<HomePromotionResult> {
    if (auth.role !== 'ADMIN') {
      return { success: false, error: { status: 403, message: 'غير مسموح بالإضافة' } };
    }
    const data = await homePromotionRepository.create(dto);
    return { success: true, data };
  }

  async update(
    auth: AuthContext,
    id: string,
    dto: UpdateHomePromotionDTO
  ): Promise<HomePromotionResult> {
    if (auth.role !== 'ADMIN') {
      return { success: false, error: { status: 403, message: 'غير مسموح بالتعديل' } };
    }
    const exists = await homePromotionRepository.exists(id);
    if (!exists) {
      return { success: false, error: { status: 404, message: 'غير موجود' } };
    }
    const data = await homePromotionRepository.update(id, dto);
    return { success: true, data };
  }

  async delete(auth: AuthContext, id: string): Promise<DeleteResult> {
    if (auth.role !== 'ADMIN') {
      return { success: false, error: { status: 403, message: 'غير مسموح بالحذف' } };
    }
    const exists = await homePromotionRepository.exists(id);
    if (!exists) {
      return { success: false, error: { status: 404, message: 'غير موجود' } };
    }
    await homePromotionRepository.delete(id);
    return { success: true };
  }
}

export const homePromotionManager = new HomePromotionManager();
