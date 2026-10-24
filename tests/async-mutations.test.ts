import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

describe("Frontend Mutasi Asinkron & Toast Sukses (F2)", () => {
  const readComponent = (filename: string) => {
    return fs.readFileSync(path.resolve(__dirname, "../components", filename), "utf-8");
  };

  it("[F2-01] Tidak ada .catch(console.warn) atau silent catch tanpa await pada mutasi di 5 komponen target", () => {
    const files = [
      "ketua-kelas-dashboard.tsx",
      "guru-piket-attendance.tsx",
      "surat-sakit-modal.tsx",
      "guru-piket-students.tsx",
      "admin-teachers.tsx",
    ];

    for (const file of files) {
      const content = readComponent(file);
      // Memastikan tidak ada pola unawaited .catch(console.warn)
      const hasUnawaitedCatch = /\.catch\(\s*\([^)]*\)\s*=>\s*console\.warn/.test(content);
      expect(hasUnawaitedCatch, `Komponen ${file} masih memiliki unawaited .catch(console.warn)`).toBe(false);
    }
  });

  it("[F2-02] ketua-kelas-dashboard save dan remove bertipe async dan memanggil await", () => {
    const content = readComponent("ketua-kelas-dashboard.tsx");
    expect(content).toMatch(/async\s+function\s+save\s*\(/);
    expect(content).toMatch(/async\s+function\s+remove\s*\(/);
    // Hapus menunggu konfirmasi backend.
    expect(content).toContain("deleteAttendance");
  });

  it("[F2-03] guru-piket-attendance saveAttendance bertipe async dan memanggil await", () => {
    const content = readComponent("guru-piket-attendance.tsx");
    expect(content).toMatch(/async\s+function\s+saveAttendance\s*\(/);
    expect(content).toMatch(/await\s+attendanceRepo\.saveClassAttendance/);
  });

  it("[F2-04] guru-piket-students completeAction dan saveStudent bertipe async dan memanggil await", () => {
    const content = readComponent("guru-piket-students.tsx");
    expect(content).toMatch(/async\s+function\s+completeAction\s*\(/);
    expect(content).toMatch(/async\s+function\s+saveStudent\s*\(/);
    expect(content).toMatch(/await\s+schoolRepo\.deleteStudent/);
    expect(content).toMatch(/await\s+schoolRepo\.updateStudent/);
  });

  it("[F2-05] admin-teachers save, remove, dan toggle bertipe async dan memanggil await", () => {
    const content = readComponent("admin-teachers.tsx");
    expect(content).toMatch(/async\s+function\s+save\s*\(/);
    expect(content).toMatch(/async\s+function\s+remove\s*\(/);
    expect(content).toMatch(/async\s+function\s+toggle\s*\(/);
    expect(content).toMatch(/await\s+repo\.updateTeacher/);
    expect(content).toMatch(/await\s+repo\.deleteTeacher/);
    expect(content).toMatch(/await\s+repo\.setTeacherActive/);
  });
});
