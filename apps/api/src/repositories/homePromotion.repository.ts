import { prisma } from '../utils/prisma';
import {
  CreateHomePromotionDTO,
  HomePromotionDTO,
  UpdateHomePromotionDTO,
} from '../types/homePromotion.types';

function normalizeOptionalString(v: string | null | undefined): string | null {
  if (v === undefined || v === null) return null;
  const t = v.trim();
  return t === '' ? null : t;
}

export class HomePromotionRepository {
  async findVisiblePublic(now: Date = new Date()): Promise<HomePromotionDTO[]> {
    const rows = await prisma.homePromotion.findMany({
      where: {
        active: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return rows;
  }

  async findAllAdmin(): Promise<HomePromotionDTO[]> {
    return prisma.homePromotion.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findById(id: string): Promise<HomePromotionDTO | null> {
    return prisma.homePromotion.findUnique({ where: { id } });
  }

  async create(data: CreateHomePromotionDTO): Promise<HomePromotionDTO> {
    return prisma.homePromotion.create({
      data: {
        title: data.title.trim(),
        body: normalizeOptionalString(data.body ?? undefined),
        imageUrl: normalizeOptionalString(data.imageUrl ?? undefined),
        linkUrl: normalizeOptionalString(data.linkUrl ?? undefined),
        linkLabel: normalizeOptionalString(data.linkLabel ?? undefined),
        linkUrlMale: normalizeOptionalString(data.linkUrlMale ?? undefined),
        linkLabelMale: normalizeOptionalString(data.linkLabelMale ?? undefined),
        linkUrlFemale: normalizeOptionalString(data.linkUrlFemale ?? undefined),
        linkLabelFemale: normalizeOptionalString(data.linkLabelFemale ?? undefined),
        zoomUrl: normalizeOptionalString(data.zoomUrl ?? undefined),
        youtubeUrl: normalizeOptionalString(data.youtubeUrl ?? undefined),
        active: data.active ?? true,
        sortOrder: data.sortOrder ?? 0,
        startsAt: data.startsAt ?? null,
        endsAt: data.endsAt ?? null,
      },
    });
  }

  async update(id: string, data: UpdateHomePromotionDTO): Promise<HomePromotionDTO> {
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title.trim();
    if (data.body !== undefined) patch.body = normalizeOptionalString(data.body);
    if (data.imageUrl !== undefined) patch.imageUrl = normalizeOptionalString(data.imageUrl);
    if (data.linkUrl !== undefined) patch.linkUrl = normalizeOptionalString(data.linkUrl);
    if (data.linkLabel !== undefined) patch.linkLabel = normalizeOptionalString(data.linkLabel);
    if (data.linkUrlMale !== undefined) patch.linkUrlMale = normalizeOptionalString(data.linkUrlMale);
    if (data.linkLabelMale !== undefined) patch.linkLabelMale = normalizeOptionalString(data.linkLabelMale);
    if (data.linkUrlFemale !== undefined) patch.linkUrlFemale = normalizeOptionalString(data.linkUrlFemale);
    if (data.linkLabelFemale !== undefined) patch.linkLabelFemale = normalizeOptionalString(data.linkLabelFemale);
    if (data.zoomUrl !== undefined) patch.zoomUrl = normalizeOptionalString(data.zoomUrl);
    if (data.youtubeUrl !== undefined) patch.youtubeUrl = normalizeOptionalString(data.youtubeUrl);
    if (data.active !== undefined) patch.active = data.active;
    if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
    if (data.startsAt !== undefined) patch.startsAt = data.startsAt;
    if (data.endsAt !== undefined) patch.endsAt = data.endsAt;

    return prisma.homePromotion.update({
      where: { id },
      data: patch as UpdateHomePromotionDTO,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.homePromotion.delete({ where: { id } });
  }

  async exists(id: string): Promise<boolean> {
    const row = await prisma.homePromotion.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!row;
  }
}

export const homePromotionRepository = new HomePromotionRepository();
