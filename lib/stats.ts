import type { ClassSummary, Tone } from "./types";

export const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

export function currentMonthRange() {
  const today = new Date();
  const dateText = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { from: dateText(new Date(today.getFullYear(), today.getMonth(), 1)), to: dateText(new Date(today.getFullYear(), today.getMonth() + 1, 0)) };
}

export function classProgress(c: ClassSummary): { label: string; tone: Tone } {
  const recorded = c.hadir + c.izin + c.sakit + c.alpa;
  if (recorded === 0) return { label: "Belum presensi", tone: "neutral" };
  return recorded < c.siswa ? { label: "Sebagian", tone: "warning" } : { label: "Selesai", tone: "success" };
}

const DAY_MS = 86_400_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(date: string): number | null {
  if (!DATE_PATTERN.test(date)) return null;
  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date ? timestamp : null;
}

export function isValidDateRange(from: string, to: string): boolean {
  const start = parseDate(from);
  const end = parseDate(to);
  return start !== null && end !== null && end >= start && (end - start) / DAY_MS + 1 <= 366;
}

/** Jumlah hari Senin-Jumat (inklusif). Pakai UTC agar hasil tidak bergantung zona waktu browser. */
export function workDays(from: string, to: string): number {
  if (!isValidDateRange(from, to)) return 0;
  const start = parseDate(from);
  const end = parseDate(to);
  if (start === null || end === null) return 0;
  const totalDays = (end - start) / DAY_MS + 1;
  const fullWeeks = Math.floor(totalDays / 7);
  const remainingDays = totalDays % 7;
  let workDayCount = fullWeeks * 5;
  const firstWeekday = new Date(start).getUTCDay();
  for (let offset = 0; offset < remainingDays; offset++) {
    const weekday = (firstWeekday + offset) % 7;
    if (weekday !== 0 && weekday !== 6) workDayCount++;
  }
  return workDayCount;
}
