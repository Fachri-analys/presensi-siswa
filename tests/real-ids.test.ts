import { describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { createApiSchoolRepository } from "../lib/data/api-school";

describe("Frontend ID Nyata & Penghapusan Mock ID (F5)", () => {
  it("[F5-01] OWN_CLASS_ID tidak dipakai di app maupun components", () => {
    const checkDir = (dirName: string) => {
      const fullPath = path.resolve(__dirname, "..", dirName);
      const entries = fs.readdirSync(fullPath, { recursive: true, withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
          const filePath = path.join(entry.parentPath || entry.path, entry.name);
          const content = fs.readFileSync(filePath, "utf-8");
          expect(content, `File ${entry.name} masih mengimpor atau menggunakan OWN_CLASS_ID`).not.toContain("OWN_CLASS_ID");
        }
      }
    };

    checkDir("app");
    checkDir("components");
  });

  it("[F5-02] app/(app)/monitoring/[kelas]/page.tsx adalah client component dan tidak memanggil getClass mock", () => {
    const pageContent = fs.readFileSync(
      path.resolve(__dirname, "../app/(app)/monitoring/[kelas]/page.tsx"),
      "utf-8"
    );
    expect(pageContent).toMatch(/^["']use client["']/);
    expect(pageContent).not.toContain('import { getClass } from "@/lib/mock"');
  });

  it("[F5-03] SchoolRepository memiliki method getClass(id) yang memanggil GET /classes/:id", async () => {
    const mockClass = {
      id: "cm1234567890cuid",
      nama: "XII RPL 1",
      jurusan: "RPL",
      ketuaAkunId: "usr-ketua-1",
      active: true,
    };

    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(mockClass), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const prevEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1/";

    try {
      const repo = createApiSchoolRepository(fetcher)!;
      expect(typeof (repo as unknown as { getClass?: unknown }).getClass).toBe("function");

      const res = await (repo as unknown as { getClass: (id: string) => Promise<typeof mockClass> }).getClass("cm1234567890cuid");
      expect(res.id).toBe("cm1234567890cuid");
      expect(res.nama).toBe("XII RPL 1");

      const [url] = fetcher.mock.calls[0];
      expect(String(url)).toBe("http://localhost:4000/api/v1/classes/cm1234567890cuid");
    } finally {
      process.env.NEXT_PUBLIC_API_BASE_URL = prevEnv;
    }
  });

  it("[F5-04] ketua-kelas-dashboard menggunakan session kelasId, bukan konstanta mock", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "../components/ketua-kelas-dashboard.tsx"),
      "utf-8"
    );
    expect(content).not.toContain("OWN_CLASS_ID");
    expect(content).toMatch(/kelasId/);
  });
});
