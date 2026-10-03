export type Role = "KETUA_KELAS" | "GURU_PIKET" | "ADMIN";
export type Status = "HADIR" | "TERLAMBAT" | "IZIN" | "SAKIT" | "ALPA";
export type Tone = "success" | "info" | "warning" | "danger" | "accent" | "neutral";

export const STATUS_LABEL: Record<Status, string> = {
  HADIR: "Hadir",
  TERLAMBAT: "Terlambat",
  IZIN: "Izin",
  SAKIT: "Sakit",
  ALPA: "Alpa",
};

/** status null = belum presensi */
export interface Student {
  nis: string;
  nama: string;
  status: Status | null;
  waktu: string | null;
  keterangan: string;
}

/** `hadir` sudah termasuk `terlambat`. */
export interface ClassSummary {
  id: string;
  nama: string;
  jurusan: string;
  siswa: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  terlambat: number;
}

export interface RecapRow {
  nis: string;
  nama: string;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  terlambat: number;
}

export const ROLE_LABEL: Record<Role, string> = { KETUA_KELAS: "Ketua Kelas", GURU_PIKET: "Guru Piket", ADMIN: "Admin" };

// Dipakai ManageTable: harus `type` (bukan interface) agar kompatibel dengan Record<string, string>.
export type StudentRow = { id: string; nis: string; nama: string; kelasId: string };
export type KelasRow = { id: string; nama: string; jurusan: string; ketua: string };
export type AccountRow = { id: string; nama: string; email: string; role: Role; kelasId: string };
export type HistoryRow = { date: string; hadir: number; izin: number; sakit: number; alpa: number; terlambat: number };
