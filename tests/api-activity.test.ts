import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiActivityRepository } from "../lib/data/api-activity";

describe("api-activity repository integration", () => {
  const prevEnv = process.env.NEXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1/";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = prevEnv;
  });

  it("[INT-ACT-01] listActivity() memanggil GET /audit-logs dan mengembalikan log dengan actor", async () => {
    const mockPage = {
      items: [
        {
          id: "log-1",
          action: "Presensi disimpan",
          objectType: "Attendance",
          objectId: "att-1",
          result: "SUCCESS",
          metadata: { note: "ok" },
          createdAt: "2026-10-16T10:00:00.000Z",
          actor: {
            id: "usr-1",
            nama: "Admin Sekolah",
            role: "ADMIN",
          },
        },
      ],
      nextCursor: null,
      total: 1,
    };

    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(mockPage), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const repo = createApiActivityRepository(fetcher)!;
    const res = await repo.listActivity();

    expect(res.items.length).toBe(1);
    expect(res.items[0].action).toBe("Presensi disimpan");
    expect(res.items[0].actorName).toBe("Admin Sekolah");
    const [url] = fetcher.mock.calls[0];
    const parsedUrl = new URL(String(url));
    expect(parsedUrl.pathname).toBe("/api/v1/audit-logs");
    expect(parsedUrl.searchParams.get("page")).toBe("1");
    expect(parsedUrl.searchParams.get("limit")).toBe("20");
  });
});
