import { DateTime } from 'luxon';

export type WeeklyScheduleWindow = {
  dayOfWeek: number;
  start: string;
  end: string;
};

/**
 * Parse weekly schedule JSON. dayOfWeek: 0 = Sunday … 6 = Saturday (JavaScript convention).
 */
export function parseWeeklySchedule(json: string): WeeklyScheduleWindow[] {
  try {
    const raw = JSON.parse(json);
    if (!Array.isArray(raw)) return [];
    return raw
      .map((w) => ({
        dayOfWeek: Number(w?.dayOfWeek),
        start: String(w?.start ?? ''),
        end: String(w?.end ?? ''),
      }))
      .filter(
        (w) =>
          Number.isInteger(w.dayOfWeek) &&
          w.dayOfWeek >= 0 &&
          w.dayOfWeek <= 6 &&
          /^\d{1,2}:\d{2}$/.test(w.start) &&
          /^\d{1,2}:\d{2}$/.test(w.end)
      );
  } catch {
    return [];
  }
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

/**
 * True if local wall-clock in `timezone` falls inside any configured window.
 */
export function isWithinWeeklySchedule(
  windows: WeeklyScheduleWindow[],
  timezone: string,
  now: Date = new Date()
): boolean {
  if (windows.length === 0) return false;
  const dt = DateTime.fromJSDate(now, { zone: 'utc' }).setZone(timezone);
  if (!dt.isValid) return false;
  // Luxon: Monday=1 … Sunday=7 → JS Sunday=0 … Saturday=6
  const jsDay = dt.weekday === 7 ? 0 : dt.weekday;
  const minutes = dt.hour * 60 + dt.minute;

  for (const w of windows) {
    if (w.dayOfWeek !== jsDay) continue;
    const startM = toMinutes(w.start);
    const endM = toMinutes(w.end);
    if (Number.isNaN(startM) || Number.isNaN(endM)) continue;
    if (endM > startM) {
      if (minutes >= startM && minutes < endM) return true;
    } else {
      // crosses midnight
      if (minutes >= startM || minutes < endM) return true;
    }
  }
  return false;
}

export type ManualOverride = 'AUTO' | 'FORCE_LIVE' | 'FORCE_OFF';

export function computeIsLiveFromSettings(params: {
  manualOverride: string;
  timezone: string;
  weeklyScheduleJson: string;
  now?: Date;
}): boolean {
  const override = params.manualOverride as ManualOverride;
  if (override === 'FORCE_LIVE') return true;
  if (override === 'FORCE_OFF') return false;
  const windows = parseWeeklySchedule(params.weeklyScheduleJson);
  return isWithinWeeklySchedule(windows, params.timezone, params.now ?? new Date());
}

const DAY_NAMES_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** Short labels for common IANA zones (Arabic UX). */
export function friendlyTimezoneLabelAr(timezone: string): string {
  const map: Record<string, string> = {
    'Asia/Jerusalem': 'توقيت القدس',
    'Asia/Gaza': 'توقيت فلسطين',
    'Asia/Riyadh': 'توقيت السعودية',
    'Asia/Amman': 'توقيت الأردن',
    'Asia/Beirut': 'توقيت بيروت',
    'Asia/Dubai': 'توقيت الإمارات',
  };
  return map[timezone] || timezone;
}

/**
 * Human-readable Arabic summary of weekly windows for public UI (e.g. modal under Zoom button).
 */
export function formatWeeklyScheduleSummaryAr(windows: WeeklyScheduleWindow[], timezone: string): string {
  if (windows.length === 0) {
    return 'لم تُحدَّد أوقات بث أسبوعية في لوحة الإدارة بعد؛ يرجى متابعة إعلانات المعهد أو التواصل معنا.';
  }
  const sorted = [...windows].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.start.localeCompare(b.start)
  );
  const parts = sorted.map((w) => {
    const day = DAY_NAMES_AR[w.dayOfWeek] ?? `يوم ${w.dayOfWeek}`;
    return `${day} ${w.start}–${w.end}`;
  });
  const tz = friendlyTimezoneLabelAr(timezone);
  return `أوقات البث (${tz}): ${parts.join(' — ')}`;
}
