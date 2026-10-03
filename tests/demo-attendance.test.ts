import { describe, expect, it } from "vitest";
import { getStoredAttendanceHistory, getStoredAttendanceRecap } from "../lib/demo-attendance";
import type { DemoStudent } from "../lib/demo-students";

const students: DemoStudent[] = [
  { id: "student-1", nis: "100", nama: "Siswa Aktif", kelasId: "class-1", status: "active" },
  { id: "student-2", nis: "101", nama: "Siswa Nonaktif Berhistori", kelasId: "class-1", status: "inactive" },
  { id: "student-3", nis: "102", nama: "Siswa Nonaktif Tanpa Riwayat", kelasId: "class-1", status: "inactive" },
];

const attendance = {
  "2026-09-01::class-1": {
    "100": { status: "HADIR" as const, waktu: "07.00", keterangan: "" },
    "101": { status: "IZIN" as const, waktu: null, keterangan: "" },
  },
  "2026-09-02::class-1": {
    "100": { status: "ALPA" as const, waktu: null, keterangan: "" },
  },
  "2026-09-03::class-1": {
    "100": { status: null, waktu: null, keterangan: "" },
  },
};

describe("rekap dan riwayat presensi tersimpan", () => {
  it("hanya mencatat hari dengan status dan mengecualikan presensi yang dihapus", () => {
    expect(getStoredAttendanceHistory(attendance, "class-1", "2026-09-01", "2026-09-03")).toEqual([
      { date: "2026-09-02", hadir: 0, izin: 0, sakit: 0, alpa: 1, terlambat: 0 },
      { date: "2026-09-01", hadir: 1, izin: 1, sakit: 0, alpa: 0, terlambat: 0 },
    ]);
  });

  it("memasukkan siswa nonaktif yang masih punya catatan dan menyembunyikan yang tidak punya", () => {
    expect(getStoredAttendanceRecap(attendance, "class-1", "2026-09-01", "2026-09-03", students)).toEqual({
      rows: [
        { nis: "100", nama: "Siswa Aktif", hadir: 1, izin: 0, sakit: 0, alpa: 1, terlambat: 0 },
        { nis: "101", nama: "Siswa Nonaktif Berhistori", hadir: 0, izin: 1, sakit: 0, alpa: 0, terlambat: 0 },
      ],
      days: 2,
    });
  });

  it("mengembalikan null jika semua catatan hari sudah dihapus", () => {
    expect(getStoredAttendanceRecap(
      { "2026-09-03::class-1": attendance["2026-09-03::class-1"] },
      "class-1",
      "2026-09-03",
      "2026-09-03",
      students,
    )).toBeNull();
  });
});
