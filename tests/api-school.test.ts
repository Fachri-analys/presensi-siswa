import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiSchoolRepository } from "../lib/data/api-school";

describe("api-school repository integration", () => {
  const prevEnv = process.env.NEXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1/";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = prevEnv;
  });

  // [INT-SCH-01] List classes memanggil endpoint /classes dan mendecode hasil
  it("[INT-SCH-01] listClasses() memanggil GET /classes dan mengembalikan daftar kelas", async () => {
    const mockClasses = [
      { id: "cls-1", nama: "XI PPLG 1", jurusan: "PPLG", ketuaAkunId: "usr-1", active: true },
      { id: "cls-2", nama: "X PPLG 1", jurusan: "PPLG", ketuaAkunId: null, active: true },
    ];

    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(mockClasses), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const repo = createApiSchoolRepository(fetcher)!;
    const page = await repo.listClasses();

    expect(page.items.length).toBe(2);
    expect(page.items[0].nama).toBe("XI PPLG 1");
    expect(fetcher).toHaveBeenCalledWith(
      expect.objectContaining({ href: "http://localhost:4000/api/v1/classes" }),
      expect.anything(),
    );
  });

  // [INT-SCH-02] Create class memanggil POST /classes
  it("[INT-SCH-02] createClass() mengirim body JSON ke POST /classes", async () => {
    const mockCreated = { id: "cls-3", nama: "XII PPLG 1", jurusan: "PPLG", ketuaAkunId: null, active: true };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(mockCreated), {
        headers: { "content-type": "application/json" },
        status: 201,
      }),
    );

    const repo = createApiSchoolRepository(fetcher)!;
    const result = await repo.createClass({ nama: "XII PPLG 1", jurusan: "PPLG" });

    expect(result.id).toBe("cls-3");
    const [, init] = fetcher.mock.calls[0];
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ nama: "XII PPLG 1", jurusan: "PPLG" });
  });

  // [INT-SCH-03] List students dengan pagination dan filter kelas
  it("[INT-SCH-03] listStudents() mengirim query params page, limit, search, dan kelasId", async () => {
    const mockPage = {
      items: [
        { id: "std-1", nis: "241101", nama: "Ahmad", kelasId: "cls-1", status: "active" },
      ],
      nextCursor: "2",
      total: 30,
    };

    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(mockPage), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const repo = createApiSchoolRepository(fetcher)!;
    const result = await repo.listStudents({ cursor: "1", limit: 10, search: "Ahmad", kelasId: "cls-1" });

    expect(result.items.length).toBe(1);
    expect(result.total).toBe(30);
    const [url] = fetcher.mock.calls[0];
    const parsedUrl = new URL(String(url));
    expect(parsedUrl.searchParams.get("page")).toBe("1");
    expect(parsedUrl.searchParams.get("limit")).toBe("10");
    expect(parsedUrl.searchParams.get("search")).toBe("Ahmad");
    expect(parsedUrl.searchParams.get("kelasId")).toBe("cls-1");
  });

  it("listStudents() mengirim halaman dan status ke backend untuk paginasi server-side", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [], nextCursor: null, total: 125 }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    const repo = createApiSchoolRepository(fetcher)!;

    const result = await repo.listStudents({ cursor: "3", limit: 10, status: "inactive" });

    expect(result.total).toBe(125);
    const [url] = fetcher.mock.calls[0];
    const parsedUrl = new URL(String(url));
    expect(parsedUrl.searchParams.get("page")).toBe("3");
    expect(parsedUrl.searchParams.get("limit")).toBe("10");
    expect(parsedUrl.searchParams.get("status")).toBe("inactive");
  });

  // [INT-SCH-04] Set student active status
  it("[INT-SCH-04] setStudentActive() mengirim status perubahan ke PATCH /students/:id", async () => {
    const mockUpdated = { id: "std-1", nis: "241101", nama: "Ahmad", kelasId: "cls-1", status: "inactive" };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(mockUpdated), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const repo = createApiSchoolRepository(fetcher)!;
    const result = await repo.setStudentActive("std-1", false);

    expect(result.status).toBe("inactive");
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toBe("http://localhost:4000/api/v1/students/std-1");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ status: "inactive" });
  });
});
