import { countEffectiveDays } from './effective-days';

describe('countEffectiveDays', () => {
  const originalDays = process.env.SCHOOL_WORKING_DAYS;
  const originalHolidays = process.env.SCHOOL_HOLIDAYS;

  afterEach(() => {
    if (originalDays === undefined) delete process.env.SCHOOL_WORKING_DAYS;
    else process.env.SCHOOL_WORKING_DAYS = originalDays;
    if (originalHolidays === undefined) delete process.env.SCHOOL_HOLIDAYS;
    else process.env.SCHOOL_HOLIDAYS = originalHolidays;
  });

  it('uses configured weekdays and excludes configured holidays', () => {
    process.env.SCHOOL_WORKING_DAYS = '1,2,3,4,5';
    process.env.SCHOOL_HOLIDAYS = '2026-10-16';
    expect(countEffectiveDays(new Date('2026-10-16'), new Date('2026-10-19'))).toBe(1);
  });

  it('supports schools that operate on Saturday', () => {
    process.env.SCHOOL_WORKING_DAYS = '1,2,3,4,5,6';
    process.env.SCHOOL_HOLIDAYS = '';
    expect(countEffectiveDays(new Date('2026-10-16'), new Date('2026-10-17'))).toBe(2);
  });
});
