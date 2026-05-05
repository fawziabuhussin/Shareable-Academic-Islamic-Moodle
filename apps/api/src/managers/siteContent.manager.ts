import { siteContentSettingsRepository } from '../repositories/siteContentSettings.repository';
import type { UpdateSiteContentSettingsInput } from '../schemas/siteContent.schema';
import type { AuthContext } from '../types/common.types';

export class SiteContentManager {
  async getPublic() {
    const row = await siteContentSettingsRepository.getSingleton();
    if (!row) {
      return {
        success: true as const,
        data: {
          registrationUrl: 'https://sites.google.com/view/zad2023/home',
          youtubeUrl: 'https://www.youtube.com/@amjadkeadan/playlists',
          mapsInfoUrl: null as string | null,
        },
      };
    }
    return {
      success: true as const,
      data: {
        registrationUrl: row.registrationUrl,
        youtubeUrl: row.youtubeUrl,
        mapsInfoUrl: row.mapsInfoUrl,
      },
    };
  }

  async getAdmin(auth: AuthContext) {
    if (auth.role !== 'ADMIN') {
      return { success: false as const, error: { status: 403, message: 'غير مسموح' } };
    }
    const row = await siteContentSettingsRepository.getSingleton();
    if (!row) {
      return { success: false as const, error: { status: 404, message: 'لم يُعثر على الإعدادات' } };
    }
    return { success: true as const, data: row };
  }

  async updateAdmin(auth: AuthContext, input: UpdateSiteContentSettingsInput) {
    if (auth.role !== 'ADMIN') {
      return { success: false as const, error: { status: 403, message: 'غير مسموح' } };
    }
    const row = await siteContentSettingsRepository.update(input);
    return { success: true as const, data: row };
  }
}

export const siteContentManager = new SiteContentManager();
