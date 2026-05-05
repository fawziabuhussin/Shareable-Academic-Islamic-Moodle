import { prisma } from '../utils/prisma';
import type { SiteContentSettings } from '@prisma/client';

export const siteContentSettingsRepository = {
  async getSingleton(): Promise<SiteContentSettings | null> {
    return prisma.siteContentSettings.findUnique({ where: { id: 1 } });
  },

  async update(data: {
    registrationUrl?: string;
    youtubeUrl?: string;
    mapsInfoUrl?: string | null;
  }): Promise<SiteContentSettings> {
    return prisma.siteContentSettings.update({
      where: { id: 1 },
      data,
    });
  },
};
