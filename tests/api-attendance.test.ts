import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiAttendanceRepository } from "../lib/data/api-attendance";

describe("api-attendance repository integration", () => {
  const prevEnv = process.env.NEXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1/";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = prevEnv;
  });

  // [INT-ATT-01] Save batch attendance mengirim records ke /attendance/batch
  it("[INT-ATT-01] saveClassAttendance() memanggil POST /attendance/batch", async () => {
    const mockSaved = [
      {
        id: "att-1",
        date: "2026-10-16",
        kelasId: "cls-1",
        nis: "241101",
        status: "HADIR",
        waktu: "07:15",
        keterangan: "",
        createdBy: "usr-1",
        updatedBy: "usr-1",
        updatedAt: "2026-10-16T07:15:00.000Z",
      },
    ];

    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(mockSaved), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const repo = createApiAttendanceRepository(fetcher)!;
    const records = await repo.saveClassAttendance({
      date: "2026-10-16",
      kelasId: "cls-1",
      records: [{ nis: "241101", status: "HADIR", waktu: "07:15", keterangan: "" }],
    });

    expect(records.length).toBe(1);
    expect(records[0].nis).toBe("241101");
    expect(records[0].status).toBe("HADIR");
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toBe("http://localhost:4000/api/v1/attendance/batch");
    expect(init?.method).toBe("POST");
  });

  // [INT-ATT-02] List class attendance mengambil presensi per kelas dan tanggal
  it("[INT-ATT-02] listClassAttendance() mengirim kelasId dan date ke GET /attendance", async () => {
    const mockList = [
      {
        id: "att-1",
        date: "2026-10-16",
        kelasId: "cls-1",
        nis: "241101",
        status: "HADIR",
        waktu: "07:15",
        keterangan: "",
        createdBy: "usr-1",
        updatedBy: "usr-1",
        updatedAt: "2026-10-16T07:15:00.000Z",
      },
    ];

    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(mockList), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const repo = createApiAttendanceRepository(fetcher)!;
    const result = await repo.listClassAttendance("cls-1", "2026-10-16");

    expect(result.length).toBe(1);
    const [url] = fetcher.mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.searchParams.get("kelasId")).toBe("cls-1");
    expect(parsed.searchParams.get("date")).toBe("2026-10-16");
  });

  // [INT-ATT-03] Get report semester mengambil rekap akumulasi kehadiran
  it("[INT-ATT-03] getReport() mengambil rekap kehadiran semester dari /attendance/recap", async () => {
    const mockReport = {
      kelas: { id: "cls-1", nama: "XI PPLG 1", jurusan: "PPLG", ketuaAkunId: null, active: true },
      from: "2026-07-01",
      to: "2026-12-31",
      effectiveDays: 20,
      rows: [
        { nis: "241101", nama: "Ahmad", hadir: 18, izin: 1, sakit: 1, alpa: 0, terlambat: 0 },
      ],
    };

    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(mockReport), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const repo = createApiAttendanceRepository(fetcher)!;
    const report = await repo.getReport({ kelasId: "cls-1", from: "2026-07-01", to: "2026-12-31" });

    expect(report.effectiveDays).toBe(20);
    expect(report.rows[0].nama).toBe("Ahmad");
    expect(report.rows[0].hadir).toBe(18);
  });
});
