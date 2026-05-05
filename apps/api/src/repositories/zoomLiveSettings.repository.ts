import { prisma } from '../utils/prisma';
import type { ZoomLiveSettings } from '@prisma/client';

export const zoomLiveSettingsRepository = {
  async getSingleton(): Promise<ZoomLiveSettings | null> {
    return prisma.zoomLiveSettings.findUnique({ where: { id: 1 } });
  },

  async update(data: {
    zoomUrl?: string;
    timezone?: string;
    weeklyScheduleJson?: string;
    manualOverride?: string;
    showButton?: boolean;
    nextSessionMessageAr?: string | null;
    buttonLabelAr?: string;
  }): Promise<ZoomLiveSettings> {
    return prisma.zoomLiveSettings.update({
      where: { id: 1 },
      data,
    });
  },
};
