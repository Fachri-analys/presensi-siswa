import { describe, expect, it } from "vitest";
import {
  canMarkPresent,
  DEFAULT_ATTENDANCE_SCHEDULE,
  getJakartaMinutes,
  getOpenAttendanceSession,
  isValidAttendanceSchedule,
} from "../lib/demo-schedule";

describe("jadwal sesi presensi demo", () => {
  it("membuka sesi hanya pada jam masuk hingga sebelum jam keluar", () => {
    expect(getOpenAttendanceSession(DEFAULT_ATTENDANCE_SCHEDULE, 7 * 60)).toBe("pagi");
    expect(getOpenAttendanceSession(DEFAULT_ATTENDANCE_SCHEDULE, 11 * 60 + 59)).toBe("pagi");
    expect(getOpenAttendanceSession(DEFAULT_ATTENDANCE_SCHEDULE, 12 * 60)).toBeNull();
    expect(getOpenAttendanceSession(DEFAULT_ATTENDANCE_SCHEDULE, 13 * 60)).toBe("siang");
    expect(getOpenAttendanceSession(DEFAULT_ATTENDANCE_SCHEDULE, 17 * 60)).toBeNull();
  });

  it("menutup sesi yang dikunci tanpa mengunci sesi lainnya", () => {
    const schedule = {
      ...DEFAULT_ATTENDANCE_SCHEDULE,
      pagi: { ...DEFAULT_ATTENDANCE_SCHEDULE.pagi, terkunci: true },
    };
    expect(getOpenAttendanceSession(schedule, 8 * 60)).toBeNull();
    expect(getOpenAttendanceSession(schedule, 14 * 60)).toBe("siang");
  });

  it("menghitung waktu berdasarkan zona Asia/Jakarta", () => {
    expect(getJakartaMinutes(new Date("2026-10-04T00:00:00.000Z"))).toBe(7 * 60);
  });

  it("menolak waktu sesi yang tidak valid atau saling tumpang tindih", () => {
    expect(isValidAttendanceSchedule({
      ...DEFAULT_ATTENDANCE_SCHEDULE,
      pagi: { ...DEFAULT_ATTENDANCE_SCHEDULE.pagi, selesai: "13:30" },
    })).toBe(false);
    expect(isValidAttendanceSchedule({
      ...DEFAULT_ATTENDANCE_SCHEDULE,
      siang: { ...DEFAULT_ATTENDANCE_SCHEDULE.siang, mulai: "18:00" },
    })).toBe(false);
  });

  it("mengizinkan status hadir di luar jadwal hanya dengan persetujuan Guru Piket", () => {
    expect(canMarkPresent(false, false)).toBe(false);
    expect(canMarkPresent(false, true)).toBe(true);
    expect(canMarkPresent(true, false)).toBe(true);
  });
});
