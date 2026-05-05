import { zoomLiveSettingsRepository } from '../repositories/zoomLiveSettings.repository';
import {
  computeIsLiveFromSettings,
  formatWeeklyScheduleSummaryAr,
  parseWeeklySchedule,
} from '../services/zoomLiveState.service';
import type { UpdateZoomLiveSettingsInput } from '../schemas/zoomLive.schema';
import type { AuthContext } from '../types/common.types';

export class ZoomLiveManager {
  async getPublicStatus() {
    const row = await zoomLiveSettingsRepository.getSingleton();
    if (!row) {
      return {
        success: true as const,
        data: {
          showButton: false,
          isLive: false,
          buttonLabelAr: 'الدخول إلى البث المباشر',
          nextSessionMessageAr: null as string | null,
          scheduleSummaryAr: null as string | null,
          zoomUrl: null as string | null,
        },
      };
    }
    const isLive =
      row.showButton &&
      row.zoomUrl.trim().length > 0 &&
      computeIsLiveFromSettings({
        manualOverride: row.manualOverride,
        timezone: row.timezone,
        weeklyScheduleJson: row.weeklyScheduleJson,
      });
    const windows = parseWeeklySchedule(row.weeklyScheduleJson);
    const scheduleSummaryAr = formatWeeklyScheduleSummaryAr(windows, row.timezone);
    return {
      success: true as const,
      data: {
        showButton: row.showButton,
        isLive,
        buttonLabelAr: row.buttonLabelAr,
        nextSessionMessageAr: row.nextSessionMessageAr,
        scheduleSummaryAr,
        zoomUrl: isLive ? row.zoomUrl.trim() : null,
      },
    };
  }

  async getAdminSettings(auth: AuthContext) {
    if (auth.role !== 'ADMIN') {
      return { success: false as const, error: { status: 403, message: 'غير مسموح' } };
    }
    const row = await zoomLiveSettingsRepository.getSingleton();
    if (!row) {
      return { success: false as const, error: { status: 404, message: 'لم يُعثر على الإعدادات' } };
    }
    let weeklySchedule: unknown[] = [];
    try {
      weeklySchedule = JSON.parse(row.weeklyScheduleJson);
      if (!Array.isArray(weeklySchedule)) weeklySchedule = [];
    } catch {
      weeklySchedule = [];
    }
    return {
      success: true as const,
      data: {
        zoomUrl: row.zoomUrl,
        timezone: row.timezone,
        weeklySchedule,
        manualOverride: row.manualOverride,
        showButton: row.showButton,
        nextSessionMessageAr: row.nextSessionMessageAr,
        buttonLabelAr: row.buttonLabelAr,
      },
    };
  }

  async updateAdminSettings(auth: AuthContext, input: UpdateZoomLiveSettingsInput) {
    if (auth.role !== 'ADMIN') {
      return { success: false as const, error: { status: 403, message: 'غير مسموح' } };
    }
    const data: Parameters<typeof zoomLiveSettingsRepository.update>[0] = {};
    if (input.zoomUrl !== undefined) data.zoomUrl = input.zoomUrl;
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.weeklySchedule !== undefined) {
      data.weeklyScheduleJson = JSON.stringify(input.weeklySchedule);
    }
    if (input.manualOverride !== undefined) data.manualOverride = input.manualOverride;
    if (input.showButton !== undefined) data.showButton = input.showButton;
    if (input.nextSessionMessageAr !== undefined) data.nextSessionMessageAr = input.nextSessionMessageAr;
    if (input.buttonLabelAr !== undefined) data.buttonLabelAr = input.buttonLabelAr;

    const row = await zoomLiveSettingsRepository.update(data);
    let weeklySchedule: unknown[] = [];
    try {
      weeklySchedule = JSON.parse(row.weeklyScheduleJson);
      if (!Array.isArray(weeklySchedule)) weeklySchedule = [];
    } catch {
      weeklySchedule = [];
    }
    return {
      success: true as const,
      data: {
        zoomUrl: row.zoomUrl,
        timezone: row.timezone,
        weeklySchedule,
        manualOverride: row.manualOverride,
        showButton: row.showButton,
        nextSessionMessageAr: row.nextSessionMessageAr,
        buttonLabelAr: row.buttonLabelAr,
      },
    };
  }
}

export const zoomLiveManager = new ZoomLiveManager();
