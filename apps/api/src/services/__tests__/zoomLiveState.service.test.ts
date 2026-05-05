import {
  parseWeeklySchedule,
  computeIsLiveFromSettings,
  formatWeeklyScheduleSummaryAr,
} from '../zoomLiveState.service';

describe('zoomLiveState.service', () => {
  it('parses valid schedule JSON', () => {
    const j = '[{"dayOfWeek":0,"start":"18:00","end":"22:00"}]';
    expect(parseWeeklySchedule(j)).toEqual([{ dayOfWeek: 0, start: '18:00', end: '22:00' }]);
  });

  it('formats Arabic schedule summary', () => {
    const windows = parseWeeklySchedule(
      '[{"dayOfWeek":0,"start":"18:00","end":"22:00"},{"dayOfWeek":2,"start":"18:00","end":"21:00"}]'
    );
    const s = formatWeeklyScheduleSummaryAr(windows, 'Asia/Jerusalem');
    expect(s).toContain('الأحد');
    expect(s).toContain('الثلاثاء');
    expect(s).toContain('توقيت القدس');
  });

  it('computes FORCE_LIVE / FORCE_OFF', () => {
    expect(
      computeIsLiveFromSettings({
        manualOverride: 'FORCE_LIVE',
        timezone: 'Asia/Jerusalem',
        weeklyScheduleJson: '[]',
      })
    ).toBe(true);
    expect(
      computeIsLiveFromSettings({
        manualOverride: 'FORCE_OFF',
        timezone: 'Asia/Jerusalem',
        weeklyScheduleJson: '[{"dayOfWeek":0,"start":"00:00","end":"23:59"}]',
      })
    ).toBe(false);
  });
});
