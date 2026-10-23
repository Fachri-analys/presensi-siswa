import { BadRequestException } from '@nestjs/common';
import { todayWib, parseDateOnly, nowWibTime } from './time.util';

describe('TimeUtil - Zona Waktu WIB (B6)', () => {
  describe('todayWib', () => {
    it('[B6-01] mengembalikan tanggal WIB saat jam 00:00-07:00 WIB (kemarin di UTC)', () => {
      // 2026-10-23 20:30 UTC = 2026-10-24 03:30 WIB
      const earlyMorningWib = new Date('2026-10-23T20:30:00.000Z');
      expect(todayWib(earlyMorningWib)).toBe('2026-10-24');
    });

    it('[B6-02] mengembalikan tanggal WIB saat sore hari', () => {
      // 2026-10-24 09:00 UTC = 2026-10-24 16:00 WIB
      const afternoonWib = new Date('2026-10-24T09:00:00.000Z');
      expect(todayWib(afternoonWib)).toBe('2026-10-24');
    });
  });

  describe('parseDateOnly', () => {
    it('[B6-03] mem-parse format YYYY-MM-DD ke Date UTC midnight', () => {
      const parsed = parseDateOnly('2026-10-24');
      expect(parsed.toISOString()).toBe('2026-10-24T00:00:00.000Z');
    });

    it('[B6-04] menolak format non YYYY-MM-DD (ISO timestamp, format acak, tanggal invalid)', () => {
      expect(() => parseDateOnly('2026-10-24T12:00:00.000Z')).toThrow(BadRequestException);
      expect(() => parseDateOnly('24-10-2026')).toThrow(BadRequestException);
      expect(() => parseDateOnly('invalid-date')).toThrow(BadRequestException);
      expect(() => parseDateOnly('2026-02-31')).toThrow(BadRequestException);
    });
  });

  describe('nowWibTime', () => {
    it('[B6-05] mengembalikan jam WIB format HH:MM', () => {
      // 2026-10-24 00:30 UTC = 2026-10-24 07:30 WIB
      const morning = new Date('2026-10-24T00:30:00.000Z');
      expect(nowWibTime(morning)).toBe('07:30');
    });

    it('[B6-06] mengembalikan jam WIB saat malam UTC (berikutnya di WIB)', () => {
      // 2026-10-23 18:00 UTC = 2026-10-24 01:00 WIB
      const lateUtc = new Date('2026-10-23T18:00:00.000Z');
      expect(nowWibTime(lateUtc)).toBe('01:00');
    });
  });
});
