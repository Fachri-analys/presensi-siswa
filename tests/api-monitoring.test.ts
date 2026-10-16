import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiMonitoringRepository } from "../lib/data/api-monitoring";

describe("api-monitoring repository integration", () => {
  const prevEnv = process.env.NEXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1/";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = prevEnv;
  });

  // [INT-MON-01] Get class summary mengambil agregasi monitoring seluruh kelas
  it("[INT-MON-01] getClassSummary() memanggil /monitoring/summary?date=... dan mendecode ringkasan", async () => {
    const mockSummary = [
      {
        id: "cls-1",
        nama: "XI PPLG 1",
        jurusan: "PPLG",
        siswa: 30,
        hadir: 28,
        izin: 1,
        sakit: 1,
        alpa: 0,
        terlambat: 2,
      },
    ];

    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(mockSummary), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const repo = createApiMonitoringRepository(fetcher)!;
    const summary = await repo.getClassSummary("2026-10-16");

    expect(summary.length).toBe(1);
    expect(summary[0].nama).toBe("XI PPLG 1");
    expect(summary[0].hadir).toBe(28);
    const [url] = fetcher.mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.pathname).toBe("/api/v1/monitoring/summary");
    expect(parsed.searchParams.get("date")).toBe("2026-10-16");
  });
});
