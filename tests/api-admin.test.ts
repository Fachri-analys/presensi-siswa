import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiAdminRepository } from "../lib/data/api-admin";

describe("api-admin repository integration", () => {
  const prevEnv = process.env.NEXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1/";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = prevEnv;
  });

  it("[INT-ADM-01] listTeachers() memanggil GET /teachers dan mengembalikan daftar guru", async () => {
    const mockTeachers = [
      { id: "tch-1", nip: "19800101", nama: "Budi Santoso", status: "active" },
    ];

    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(mockTeachers), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const repo = createApiAdminRepository(fetcher)!;
    const page = await repo.listTeachers();

    expect(page.items.length).toBe(1);
    expect(page.items[0].nama).toBe("Budi Santoso");
    expect(fetcher).toHaveBeenCalledWith(
      expect.objectContaining({ href: "http://localhost:4000/api/v1/teachers" }),
      expect.anything(),
    );
  });

  it("[INT-ADM-02] listAccounts() memanggil GET /users dan mengembalikan daftar akun", async () => {
    const mockPage = {
      items: [
        { id: "usr-1", nama: "Admin Sekolah", email: "admin@sekolah.sch.id", role: "ADMIN", kelasId: null, active: true },
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

    const repo = createApiAdminRepository(fetcher)!;
    const page = await repo.listAccounts();

    expect(page.items.length).toBe(1);
    expect(page.items[0].email).toBe("admin@sekolah.sch.id");
  });

  it("[INT-ADM-03] createAccount() mengirim POST /users dengan body akun baru", async () => {
    const mockCreated = {
      id: "usr-2",
      nama: "Guru Piket",
      email: "guru@sekolah.sch.id",
      role: "GURU_PIKET",
      kelasId: null,
      active: true,
    };

    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(mockCreated), {
        headers: { "content-type": "application/json" },
        status: 201,
      }),
    );

    const repo = createApiAdminRepository(fetcher)!;
    const res = await repo.createAccount({
      nama: "Guru Piket",
      email: "guru@sekolah.sch.id",
      role: "GURU_PIKET",
      kelasId: null,
      password: "KataSandiAwalYgPanjang!",
    });

    expect(res.id).toBe("usr-2");
    const [, init] = fetcher.mock.calls[0];
    expect(init?.method).toBe("POST");
  });

});
