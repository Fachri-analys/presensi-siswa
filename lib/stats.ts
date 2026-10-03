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

/** Jumlah hari Senin-Jumat (inklusif). Pakai UTC agar hasil tidak bergantung zona waktu browser. */
export function workDays(from: string, to: string): number {
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  let days = 0;
  for (let t = start; t <= end; t += 86_400_000) {
    const weekday = new Date(t).getUTCDay();
    if (weekday !== 0 && weekday !== 6) days++;
  }
  return days;
}
