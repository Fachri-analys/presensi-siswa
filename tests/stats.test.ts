import { describe, expect, it } from "vitest";
import { isValidDateRange, pct, workDays } from "../lib/stats";

describe("statistik presensi", () => {
  it("menghitung hari kerja inklusif tanpa bergantung zona waktu", () => {
    expect(workDays("2026-09-07", "2026-09-13")).toBe(5);
    expect(workDays("2026-09-12", "2026-09-13")).toBe(0);
  });

  it("menolak rentang tanggal tidak valid atau lebih dari 366 hari", () => {
    expect(isValidDateRange("2026-02-30", "2026-03-01")).toBe(false);
    expect(workDays("2025-01-01", "2026-01-02")).toBe(0);
  });

  it("menghitung persentase dan menjaga total kosong tetap aman", () => {
    expect(pct(3, 4)).toBe(75);
    expect(pct(0, 0)).toBe(0);
  });
});
