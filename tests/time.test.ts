import { describe, expect, it } from "vitest";
import { getLocalDateKey, getLocalTime } from "../lib/time";
import { decodeAttendanceRecord } from "../lib/data/decoders";

describe("lib/time (F3)", () => {
  it("getLocalTime harus menghasilkan format HH:mm (dengan tanda titik dua, bukan titik)", () => {
    const time = getLocalTime();
    expect(time).toMatch(/^\d{2}:\d{2}$/);
    const [h, m] = time.split(":").map(Number);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(24);
    expect(m).toBeGreaterThanOrEqual(0);
    expect(m).toBeLessThan(60);
  });

  it("getLocalDateKey harus menghasilkan format YYYY-MM-DD", () => {
    const dateKey = getLocalDateKey();
    expect(dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("decodeAttendanceRecord harus menerima waktu yang dihasilkan getLocalTime()", () => {
    const record = {
      id: "att-1",
      date: getLocalDateKey(),
      kelasId: "cls-1",
      nis: "241101",
      status: "HADIR",
      waktu: getLocalTime(),
      keterangan: "",
      createdBy: "usr-1",
      updatedBy: "usr-1",
      updatedAt: new Date().toISOString(),
    };

    expect(() => decodeAttendanceRecord(record)).not.toThrow();
  });
});
