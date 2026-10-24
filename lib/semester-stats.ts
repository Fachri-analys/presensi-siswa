export interface SemesterOption {
  id: string;
  label: string;
  tahunAjaran: string;
  tipe: "Ganjil" | "Genap";
  periode: string;
  from: string;
  to: string;
}

export const SEMESTER_OPTIONS: SemesterOption[] = [
  { id: "2026-ganjil", label: "Semester Ganjil 2026/2027", tahunAjaran: "2026/2027", tipe: "Ganjil", periode: "Juli – Desember 2026", from: "2026-07-01", to: "2026-12-31" },
  { id: "2025-genap", label: "Semester Genap 2025/2026", tahunAjaran: "2025/2026", tipe: "Genap", periode: "Januari – Juni 2026", from: "2026-01-01", to: "2026-06-30" },
  { id: "2025-ganjil", label: "Semester Ganjil 2025/2026", tahunAjaran: "2025/2026", tipe: "Ganjil", periode: "Juli – Desember 2025", from: "2025-07-01", to: "2025-12-31" },
];

export interface StudentSemesterStat {
  nis: string; nama: string; kelasId: string; kelasNama: string;
  hadir: number; izin: number; sakit: number; alpa: number;
  totalKehadiran: number; persentase: number; totalHariEfektif: number;
}

export interface SemesterStatsSummary {
  totalSiswa: number; totalHadir: number; totalIzin: number;
  totalSakit: number; totalAlpa: number; rataRataKehadiran: number;
}

export function computeSemesterSummary(stats: StudentSemesterStat[]): SemesterStatsSummary {
  if (stats.length === 0) return { totalSiswa: 0, totalHadir: 0, totalIzin: 0, totalSakit: 0, totalAlpa: 0, rataRataKehadiran: 0 };
  return {
    totalSiswa: stats.length,
    totalHadir: stats.reduce((sum, row) => sum + row.hadir, 0),
    totalIzin: stats.reduce((sum, row) => sum + row.izin, 0),
    totalSakit: stats.reduce((sum, row) => sum + row.sakit, 0),
    totalAlpa: stats.reduce((sum, row) => sum + row.alpa, 0),
    rataRataKehadiran: Math.round(stats.reduce((sum, row) => sum + row.persentase, 0) / stats.length),
  };
}
