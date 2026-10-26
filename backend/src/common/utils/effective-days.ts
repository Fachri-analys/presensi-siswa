const DAY_MS = 86_400_000;

/**
 * Hitung jumlah hari kerja (Senin-Jumat) dalam rentang [from, to] inklusif.
 * Pakai UTC agar konsisten dengan penyimpanan @db.Date.
 */
export function countEffectiveDays(from: Date, to: Date): number {
  if (to < from) return 0;
  const configuredDays = (process.env.SCHOOL_WORKING_DAYS ?? '1,2,3,4,5')
    .split(',')
    .map((day) => Number(day.trim()));
  const workingDays = new Set(configuredDays);
  const holidays = new Set(
    (process.env.SCHOOL_HOLIDAYS ?? '')
      .split(',')
      .map((date) => date.trim())
      .filter(Boolean),
  );
  let count = 0;
  const cur = new Date(from.getTime());
  while (cur <= to) {
    const utcDay = cur.getUTCDay();
    const schoolDay = utcDay === 0 ? 7 : utcDay;
    const dateKey = cur.toISOString().slice(0, 10);
    if (workingDays.has(schoolDay) && !holidays.has(dateKey)) count++;
    cur.setTime(cur.getTime() + DAY_MS);
  }
  return count;
}
