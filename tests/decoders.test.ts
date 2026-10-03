import { describe, expect, it } from "vitest";
import { ApiDecodeError, decodeAttendanceRecord, decodeAttendanceReport } from "../lib/data/decoders";

const record = {
  id: "attendance-1",
  date: "2026-09-01",
  kelasId: "class-1",
  nis: "100",
  status: "HADIR",
  waktu: "07:05",
  keterangan: "",
  createdBy: "account-1",
  updatedBy: "account-1",
  updatedAt: "2026-09-01T00:05:00.000Z",
};

const report = {
  kelas: { id: "class-1", nama: "X PPLG 1", jurusan: "PPLG", ketuaAkunId: null, active: true },
  from: "2026-09-01",
  to: "2026-09-30",
  effectiveDays: 22,
  rows: [],
};

describe("decoder tanggal dan waktu backend", () => {
  it("menerima tanggal kalender dan waktu yang valid", () => {
    expect(decodeAttendanceRecord(record).waktu).toBe("07:05");
    expect(decodeAttendanceReport(report).from).toBe("2026-09-01");
  });

  it("menolak tanggal kalender atau format tanggal yang tidak valid", () => {
    expect(() => decodeAttendanceRecord({ ...record, date: "2026-02-30" })).toThrow(ApiDecodeError);
    expect(() => decodeAttendanceReport({ ...report, to: "30-09-2026" })).toThrow(ApiDecodeError);
  });

  it("menolak waktu dengan format atau nilai di luar rentang", () => {
    expect(() => decodeAttendanceRecord({ ...record, waktu: "7:05" })).toThrow(ApiDecodeError);
    expect(() => decodeAttendanceRecord({ ...record, waktu: "24:00" })).toThrow(ApiDecodeError);
  });
});
