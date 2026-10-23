import { describe, expect, it, vi } from "vitest";
import { createApiAuthRepository } from "../lib/data/api-auth";
import { createApiClient, ApiError } from "../lib/data/api-client";

describe("Frontend Sesi & Proteksi (F1)", () => {
  it("[F1-01] getSession() memanggil /auth/me dan mengembalikan objek SessionUser lengkap (id, nama, role, kelasId)", async () => {
    const mockUser = {
      id: "usr-123",
      email: "ketua@smkn11jakarta.sch.id",
      nama: "Ahmad Ketua",
      role: "KETUA_KELAS",
      kelasId: "cls-pplg-1",
    };

    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(mockUser), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const prevEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1/";

    try {
      const authRepo = createApiAuthRepository(fetcher)!;
      const session = await authRepo.getSession();

      expect(session).not.toBeNull();
      expect(session?.id).toBe("usr-123");
      expect(session?.role).toBe("KETUA_KELAS");
      expect(session?.kelasId).toBe("cls-pplg-1");
      expect(session?.nama).toBe("Ahmad Ketua");

      const [url] = fetcher.mock.calls[0];
      expect(String(url)).toBe("http://localhost:4000/api/v1/auth/me");
    } finally {
      process.env.NEXT_PUBLIC_API_BASE_URL = prevEnv;
    }
  });

  it("[F1-02] logout() menunggu pemanggilan API backend selesai", async () => {
    let resolved = false;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10));
      resolved = true;
      return new Response(null, { status: 204 });
    });

    const prevEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1/";

    try {
      const authRepo = createApiAuthRepository(fetcher)!;
      await authRepo.logout();
      expect(resolved).toBe(true);
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally {
      process.env.NEXT_PUBLIC_API_BASE_URL = prevEnv;
    }
  });

  it("[F1-03] respons 401 pada endpoint API proteksi melempar UNAUTHENTICATED error", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ code: "UNAUTHENTICATED", message: "Sesi habis" }), {
        headers: { "content-type": "application/json" },
        status: 401,
      }),
    );

    const client = createApiClient("http://localhost:4000/api/v1/", fetcher);

    await expect(
      client("students", { method: "GET" }, (v) => v),
    ).rejects.toThrow(ApiError);
  });
});
