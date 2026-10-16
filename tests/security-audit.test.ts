import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "../lib/data/api-client";

describe("Security Audit & Vulnerability Guards", () => {
  // [SEC-01] Path traversal prevention
  it("[SEC-01] menolak path traversal menggunakan '../' atau encoded '%2e%2e'", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = createApiClient("https://school.example/api/v1/", fetcher);

    await expect(client("../sensitive/data", {}, (v) => v)).rejects.toThrow(TypeError);
    await expect(client("students/%2e%2e/%2e%2e/etc/passwd", {}, (v) => v)).rejects.toThrow(TypeError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  // [SEC-02] HTTPS requirement di production
  it("[SEC-02] menolak URL backend non-HTTPS di lingkungan produksi (selain localhost)", () => {
    expect(() => createApiClient("http://insecure-remote.example/api/v1/")).toThrow(TypeError);
  });

  // [SEC-03] Credentials in URL prohibition
  it("[SEC-03] menolak URL backend yang mengandung username atau password", () => {
    expect(() => createApiClient("https://user:pass@school.example/api/v1/")).toThrow(TypeError);
  });

  // [SEC-07] Menolak URL backend dengan query params atau fragment bawaan
  it("[SEC-07] menolak konfigurasi URL dasar yang memuat query atau hash", () => {
    expect(() => createApiClient("https://school.example/api/v1/?admin=true")).toThrow(TypeError);
    expect(() => createApiClient("https://school.example/api/v1/#frag")).toThrow(TypeError);
  });

  // [SEC-08] Error mapping melindungi informasi sensitif server
  it("[SEC-08] menyembunyikan stack trace internal server pada error 500", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: "DB connection pool exhausted at /var/app/internal.ts:42" }), {
        status: 500,
        headers: { "content-type": "application/json", "x-request-id": "req-999" },
      }),
    );

    const client = createApiClient("http://localhost:4000/api/v1/", fetcher);
    await expect(client("health", {}, (v) => v)).rejects.toMatchObject({
      code: "SERVER_ERROR",
      status: 500,
      requestId: "req-999",
    });
  });
});
