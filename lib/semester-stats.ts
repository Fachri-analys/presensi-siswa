import { getDemoStudents } from "./demo-students";
import { getClasses } from "./mock";

export interface SemesterOption {
  id: string;
  label: string;
  tahunAjaran: string;
  tipe: "Ganjil" | "Genap";
  periode: string;
  totalHariEfektif: number;
  isAktif?: boolean;
}

export const SEMESTER_OPTIONS: SemesterOption[] = [
  {
    id: "2026-ganjil",
    label: "Semester Ganjil 2026/2027 (Berjalan)",
    tahunAjaran: "2026/2027",
    tipe: "Ganjil",
    periode: "Juli – Desember 2026",
    totalHariEfektif: 108,
    isAktif: true,
  },
  {
    id: "2025-genap",
    label: "Semester Genap 2025/2026",
    tahunAjaran: "2025/2026",
    tipe: "Genap",
    periode: "Januari – Juni 2026",
    totalHariEfektif: 112,
  },
  {
    id: "2025-ganjil",
    label: "Semester Ganjil 2025/2026",
    tahunAjaran: "2025/2026",
    tipe: "Ganjil",
    periode: "Juli – Desember 2025",
    totalHariEfektif: 106,
  },
];

export interface StudentSemesterStat {
  nis: string;
  nama: string;
  kelasId: string;
  kelasNama: string;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  totalKehadiran: number;
  persentase: number;
  totalHariEfektif: number;
}

export interface SemesterStatsSummary {
  totalSiswa: number;
  totalHadir: number;
  totalIzin: number;
  totalSakit: number;
  totalAlpa: number;
  rataRataKehadiran: number;
}

function hashSeed(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Menghasilkan mock data statistik kehadiran siswa per semester secara deterministik.
 * Nilai konsisten untuk kombinasi (semesterId, nis) yang sama.
 */
export function getSemesterStudentStats(
  semesterId: string = "2026-ganjil",
  classFilter?: string
): StudentSemesterStat[] {
  const semester = SEMESTER_OPTIONS.find((s) => s.id === semesterId) ?? SEMESTER_OPTIONS[0];
  const totalHari = semester.totalHariEfektif;
  const classes = getClasses();
  const classMap = new Map(classes.map((c) => [c.id, c.nama]));

  // Ambil data siswa dari demo store (atau fallback jika belum terinisialisasi)
  let students = getDemoStudents().filter((s) => s.status === "active");
  if (students.length === 0) {
    students = classes.flatMap((c) => [
      { id: `s-${c.id}-1`, nis: `241101`, nama: "Ahmad Fauzi", kelasId: c.id, status: "active" as const },
      { id: `s-${c.id}-2`, nis: `241102`, nama: "Bagas Pratama", kelasId: c.id, status: "active" as const },
    ]);
  }

  if (classFilter && classFilter !== "all") {
    students = students.filter((s) => s.kelasId === classFilter);
  }

  return students.map((student) => {
    const seed = hashSeed(`${semester.id}-${student.nis}`);
    // Pola presensi realistis siswa SMK:
    // Mayoritas siswa hadir tinggi (90-100%)
    const izin = seed % 13 === 0 ? 3 : seed % 6 === 0 ? 2 : seed % 3 === 0 ? 1 : 0;
    const sakit = seed % 17 === 0 ? 3 : seed % 7 === 0 ? 2 : seed % 4 === 0 ? 1 : 0;
    const alpa = seed % 23 === 0 ? 2 : seed % 11 === 0 ? 1 : 0;
    const hadir = Math.max(0, totalHari - (izin + sakit + alpa));
    const persentase = totalHari ? Math.round((hadir / totalHari) * 100) : 0;

    return {
      nis: student.nis,
      nama: student.nama,
      kelasId: student.kelasId,
      kelasNama: classMap.get(student.kelasId) ?? student.kelasId,
      hadir,
      izin,
      sakit,
      alpa,
      totalKehadiran: hadir,
      persentase,
      totalHariEfektif: totalHari,
    };
  });
}

export function computeSemesterSummary(stats: StudentSemesterStat[]): SemesterStatsSummary {
  if (stats.length === 0) {
    return {
      totalSiswa: 0,
      totalHadir: 0,
      totalIzin: 0,
      totalSakit: 0,
      totalAlpa: 0,
      rataRataKehadiran: 0,
    };
  }

  const totalSiswa = stats.length;
  const totalHadir = stats.reduce((acc, s) => acc + s.hadir, 0);
  const totalIzin = stats.reduce((acc, s) => acc + s.izin, 0);
  const totalSakit = stats.reduce((acc, s) => acc + s.sakit, 0);
  const totalAlpa = stats.reduce((acc, s) => acc + s.alpa, 0);
  const totalPersentase = stats.reduce((acc, s) => acc + s.persentase, 0);
  const rataRataKehadiran = Math.round(totalPersentase / totalSiswa);

  return {
    totalSiswa,
    totalHadir,
    totalIzin,
    totalSakit,
    totalAlpa,
    rataRataKehadiran,
  };
}
