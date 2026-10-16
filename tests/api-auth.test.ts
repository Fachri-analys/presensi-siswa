import { describe, expect, it, vi } from "vitest";
import { createApiAuthRepository } from "../lib/data/api-auth";

describe("api-auth repository", () => {
  it("berhasil memanggil login ke /api/v1/auth/login dan menerima data session user", async () => {
    const mockUser = {
      id: "usr_123",
      email: "admin@smkn11jakarta.sch.id",
      nama: "Admin Sekolah",
      role: "ADMIN",
      kelasId: null,
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
      const authRepo = createApiAuthRepository(fetcher);
      expect(authRepo).not.toBeNull();

      const user = await authRepo!.login({
        identifier: "admin@smkn11jakarta.sch.id",
        password: "Admin#2026",
      });

      expect(user).toEqual(mockUser);
      expect(fetcher).toHaveBeenCalledTimes(1);
      const [url, init] = fetcher.mock.calls[0];
      expect(String(url)).toBe("http://localhost:4000/api/v1/auth/login");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toEqual({
        email: "admin@smkn11jakarta.sch.id",
        password: "Admin#2026",
      });
    } finally {
      process.env.NEXT_PUBLIC_API_BASE_URL = prevEnv;
    }
  });

  it("berhasil memanggil logout ke /api/v1/auth/logout", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 204,
      }),
    );

    const prevEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1/";

    try {
      const authRepo = createApiAuthRepository(fetcher);
      expect(authRepo).not.toBeNull();

      await authRepo!.logout();
      expect(fetcher).toHaveBeenCalledTimes(1);
      const [url, init] = fetcher.mock.calls[0];
      expect(String(url)).toBe("http://localhost:4000/api/v1/auth/logout");
      expect(init?.method).toBe("POST");
    } finally {
      process.env.NEXT_PUBLIC_API_BASE_URL = prevEnv;
    }
  });

  it("mengembalikan null ketika getSession mendapat status 401 unauthenticated", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ code: "UNAUTHENTICATED" }), {
        headers: { "content-type": "application/json" },
        status: 401,
      }),
    );

    const prevEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1/";

    try {
      const authRepo = createApiAuthRepository(fetcher);
      expect(authRepo).not.toBeNull();

      const session = await authRepo!.getSession();
      expect(session).toBeNull();
    } finally {
      process.env.NEXT_PUBLIC_API_BASE_URL = prevEnv;
    }
  });
});
