import type { AccountRow, ClassSummary, HistoryRow, KelasRow, RecapRow, Status, Student, StudentRow } from "./types";

// Data contoh. Ganti isi fungsi di file ini dengan pemanggilan API yang sudah ada;
// komponen UI hanya bergantung pada signature-nya.
const CLASSES: ClassSummary[] = [
  { id: "x-pplg-1", nama: "X PPLG 1", jurusan: "Pengembangan Perangkat Lunak dan Gim", siswa: 36, hadir: 33, izin: 1, sakit: 1, alpa: 1, terlambat: 2 },
  { id: "x-pplg-2", nama: "X PPLG 2", jurusan: "Pengembangan Perangkat Lunak dan Gim", siswa: 35, hadir: 31, izin: 2, sakit: 1, alpa: 1, terlambat: 1 },
  { id: "xi-pplg-1", nama: "XI PPLG 1", jurusan: "Pengembangan Perangkat Lunak dan Gim", siswa: 32, hadir: 28, izin: 1, sakit: 2, alpa: 1, terlambat: 3 },
  { id: "xi-tkt-1", nama: "XI TKT 1", jurusan: "Teknik Jaringan Komputer dan Telekomunikasi", siswa: 33, hadir: 25, izin: 2, sakit: 1, alpa: 0, terlambat: 1 },
  { id: "xi-dkv-1", nama: "XI DKV 1", jurusan: "Desain Komunikasi Visual", siswa: 34, hadir: 30, izin: 1, sakit: 1, alpa: 2, terlambat: 2 },
  { id: "xii-animasi-1", nama: "XII ANIMASI 1", jurusan: "Animasi", siswa: 31, hadir: 0, izin: 0, sakit: 0, alpa: 0, terlambat: 0 },
  { id: "xii-broadcasting-1", nama: "XII BROADCASTING 1", jurusan: "Broadcasting dan Perfilman", siswa: 30, hadir: 27, izin: 1, sakit: 1, alpa: 1, terlambat: 1 },
  { id: "xii-mplb-1", nama: "XII MPLB 1", jurusan: "Manajemen Perkantoran dan Layanan Bisnis", siswa: 35, hadir: 20, izin: 2, sakit: 1, alpa: 0, terlambat: 0 },
];

const FIRST = ["Ahmad", "Bagas", "Citra", "Dimas", "Eka", "Fajar", "Gita", "Hendra", "Intan", "Joko", "Kirana", "Lukman"];
const LAST = ["Fauzi", "Pratama", "Lestari", "Saputra", "Rahmawati", "Nugroho", "Maharani", "Wijaya"];
const KETERANGAN: Record<Status, string> = {
  HADIR: "Tepat waktu",
  TERLAMBAT: "Terlambat",
  IZIN: "Surat izin orang tua",
  SAKIT: "Surat keterangan dokter",
  ALPA: "Tanpa keterangan",
};

export const getClasses = () => CLASSES;
export const getClass = (id: string) => CLASSES.find((c) => c.id === id);

export function getStudents(classId: string): Student[] {
  const index = CLASSES.findIndex((c) => c.id === classId);
  if (index < 0) return [];
  const c = CLASSES[index];
  const plan: (Status | null)[] = [
    ...Array<Status>(c.hadir - c.terlambat).fill("HADIR"),
    ...Array<Status>(c.terlambat).fill("TERLAMBAT"),
    ...Array<Status>(c.izin).fill("IZIN"),
    ...Array<Status>(c.sakit).fill("SAKIT"),
    ...Array<Status>(c.alpa).fill("ALPA"),
  ];
  while (plan.length < c.siswa) plan.push(null);

  // Langkah 13 koprima dengan semua ukuran kelas, jadi status tersebar merata tanpa acak.
  return plan.map((_, i) => {
    const status = plan[(i * 13) % plan.length];
    const waktu =
      status === "HADIR" ? `06.${40 + ((i * 3) % 20)}` : status === "TERLAMBAT" ? `07.${15 + (i % 15)}` : null;
    return {
      nis: String(241101 + index * 100 + i),
      nama: `${FIRST[i % FIRST.length]} ${LAST[(i * 5 + index) % LAST.length]}`,
      status,
      waktu,
      keterangan: status ? KETERANGAN[status] : "",
    };
  });
}

export function getRecap(classId: string, days: number): RecapRow[] {
  return getStudents(classId).map((s, i) => {
    const izin = i % 4 === 3 ? 1 : 0;
    const sakit = i % 5 === 4 ? 1 : 0;
    const alpa = i % 6 === 5 ? 1 : 0;
    const terlambat = i % 3 === 2 ? 2 : 0;
    return { nis: s.nis, nama: s.nama, izin, sakit, alpa, terlambat, hadir: Math.max(days - izin - sakit - alpa, 0) };
  });
}

export const OWN_CLASS_ID = "xi-pplg-1";

export const getStudentRows = (): StudentRow[] =>
  CLASSES.flatMap((c) => getStudents(c.id).map((s) => ({ id: `s-${s.nis}`, nis: s.nis, nama: s.nama, kelasId: c.id })));

/** `ketua` berisi NIS siswa; kosong = belum ditentukan. */
export const getKelasRows = (): KelasRow[] =>
  CLASSES.map((c) => ({ id: c.id, nama: c.nama, jurusan: c.jurusan, ketua: c.id === "xii-animasi-1" ? "" : getStudents(c.id)[0].nis }));

export const getAccountRows = (): AccountRow[] => [
  { id: "a1", nama: "Admin Sekolah", email: "admin@smkn11jakarta.sch.id", role: "ADMIN", kelasId: "" },
  { id: "a2", nama: "Guru Piket Senin", email: "piket.senin@smkn11jakarta.sch.id", role: "GURU_PIKET", kelasId: "" },
  { id: "a3", nama: "Aisyah Putri", email: "aisyah.putri@smkn11jakarta.sch.id", role: "KETUA_KELAS", kelasId: OWN_CLASS_ID },
  { id: "a4", nama: "Rizky Ramadhan", email: "rizky.ramadhan@smkn11jakarta.sch.id", role: "KETUA_KELAS", kelasId: "xi-dkv-1" },
];

/** Riwayat harian (Senin-Jumat), terbaru di atas. Maksimal 92 hari agar tabel tetap ringan. */
export function getHistory(classId: string, from: string, to: string): HistoryRow[] {
  const c = getClass(classId);
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (!c || Number.isNaN(start) || Number.isNaN(end) || end < start) return [];
  const rows: HistoryRow[] = [];
  for (let t = end; t >= start && rows.length < 92; t -= 86_400_000) {
    const weekday = new Date(t).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const seed = Math.floor(t / 86_400_000);
    const izin = seed % 3, sakit = (seed >> 1) % 3, alpa = seed % 5 === 0 ? 1 : 0, terlambat = seed % 4;
    rows.push({ date: new Date(t).toISOString().slice(0, 10), izin, sakit, alpa, terlambat, hadir: c.siswa - izin - sakit - alpa });
  }
  return rows;
}
