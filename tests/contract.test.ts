import { describe, expect, it } from "vitest";
import {
  decodeAttendanceRecord,
  decodeAttendanceReport,
  decodeClass,
  decodeClassSummary,
  decodeHistoryRow,
} from "../lib/data/decoders";

describe("Test Kontrak FE-BE dengan respons Backend Asli (F4 & B5)", () => {
  it("[CONTRACT-01] decodeClass berhasil memproses respons create/update kelas backend yang sudah dimapper", () => {
    // Backend create/update harus mengembalikan mapper findOne (dengan active dan ketuaAkunId)
    const backendClassResponse = {
      id: "cls-1",
      nama: "X PPLG 1",
      jurusan: "Pengembangan Perangkat Lunak dan Gim",
      status: "active",
      active: true,
      ketuaAkunId: "usr-ketua-1",
      ketuaNama: "Ahmad Ketua",
      totalSiswa: 32,
    };

    const decoded = decodeClass(backendClassResponse);
    expect(decoded.id).toBe("cls-1");
    expect(decoded.nama).toBe("X PPLG 1");
    expect(decoded.jurusan).toBe("Pengembangan Perangkat Lunak dan Gim");
    expect(decoded.active).toBe(true);
    expect(decoded.ketuaAkunId).toBe("usr-ketua-1");
    expect(decoded.totalSiswa).toBe(32);
  });

  it("[CONTRACT-02] decodeAttendanceReport berhasil memproses respons getRecap backend lengkap", () => {
    // getRecap harus mengembalikan { kelas: {id, nama, jurusan, active, ketuaAkunId}, from, to, effectiveDays, rows }
    // dengan hadir = HADIR + TERLAMBAT
    const backendRecapResponse = {
      kelas: {
        id: "cls-1",
        nama: "XI PPLG 1",
        jurusan: "PPLG",
        active: true,
        ketuaAkunId: null,
      },
      from: "2026-07-01",
      to: "2026-12-31",
      effectiveDays: 20,
      rows: [
        {
          id: "std-1",
          nis: "241101",
          nama: "Ahmad Fauzi",
          hadir: 19, // 18 Hadir Tepat Waktu + 1 Terlambat
          terlambat: 1, // rincian
          izin: 1,
          sakit: 0,
          alpa: 0,
          persentase: 95, // 19 / 20 = 95%
        },
      ],
    };

    const decoded = decodeAttendanceReport(backendRecapResponse);
    expect(decoded.kelas.nama).toBe("XI PPLG 1");
    expect(decoded.kelas.active).toBe(true);
    expect(decoded.from).toBe("2026-07-01");
    expect(decoded.to).toBe("2026-12-31");
    expect(decoded.effectiveDays).toBe(20);
    expect(decoded.rows[0].hadir).toBe(19);
    expect(decoded.rows[0].terlambat).toBe(1);
  });

  it("[CONTRACT-03] decodeAttendanceRecord berhasil memproses rekaman presensi backend", () => {
    const backendAttendanceRecord = {
      id: "att-1",
      date: "2026-10-16",
      kelasId: "cls-1",
      nis: "241101",
      status: "HADIR",
      waktu: "07:15",
      keterangan: "Tepat waktu",
      createdBy: "usr-1",
      updatedBy: "usr-1",
      updatedAt: "2026-10-16T07:15:00.000Z",
    };

    const decoded = decodeAttendanceRecord(backendAttendanceRecord);
    expect(decoded.id).toBe("att-1");
    expect(decoded.status).toBe("HADIR");
    expect(decoded.waktu).toBe("07:15");
  });

  it("[CONTRACT-04] decodeClassSummary berhasil memproses ringkasan monitoring backend", () => {
    // hadir = HADIR + TERLAMBAT (30 = 28 hadir + 2 terlambat)
    const backendSummaryResponse = {
      id: "cls-1",
      nama: "XI PPLG 1",
      jurusan: "PPLG",
      siswa: 32,
      hadir: 30, // 28 tepat waktu + 2 terlambat
      terlambat: 2,
      izin: 1,
      sakit: 1,
      alpa: 0,
    };

    const decoded = decodeClassSummary(backendSummaryResponse);
    expect(decoded.id).toBe("cls-1");
    expect(decoded.hadir).toBe(30);
    expect(decoded.terlambat).toBe(2);
    expect(decoded.siswa).toBe(32);
  });

  it("[CONTRACT-05] decodeHistoryRow berhasil memproses baris riwayat presensi backend", () => {
    const backendHistoryResponse = {
      date: "2026-10-16",
      hadir: 31, // termasuk terlambat
      terlambat: 3,
      izin: 1,
      sakit: 0,
      alpa: 0,
    };

    const decoded = decodeHistoryRow(backendHistoryResponse);
    expect(decoded.date).toBe("2026-10-16");
    expect(decoded.hadir).toBe(31);
    expect(decoded.terlambat).toBe(3);
  });
});
