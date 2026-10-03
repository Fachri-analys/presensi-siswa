import Link from "next/link";
import { useSyncExternalStore } from "react";
import { getAccountRows, getKelasRows } from "@/lib/mock";
import { getDemoStudents, getDemoStudentsServerSnapshot, subscribeToDemoStudents } from "@/lib/demo-students";
import { useDemoManagedRows } from "./manage-table";
import { card, StatCard } from "./ui";

const LINKS = [
  { href: "/siswa", title: "Kelola siswa", note: "Tambah, ubah, dan hapus data siswa." },
  { href: "/guru", title: "Kelola guru", note: "Tambah, ubah, hapus, atau nonaktifkan data guru." },
  { href: "/kelas", title: "Kelola kelas", note: "Atur kelas dan tentukan Ketua Kelas." },
  { href: "/pengaturan", title: "Akun pengguna", note: "Kelola akun Admin, Guru Piket, dan Ketua Kelas." },
  { href: "/monitoring", title: "Pantau presensi", note: "Lihat rekap kehadiran seluruh kelas." },
  { href: "/presensi", title: "Isi presensi", note: "Catat presensi untuk kelas mana pun." },
  { href: "/riwayat", title: "Riwayat presensi", note: "Tinjau presensi harian menurut kelas dan periode." },
  { href: "/laporan", title: "Laporan", note: "Buat dan cetak laporan presensi." },
  { href: "/log-aktivitas", title: "Log aktivitas", note: "Pantau perubahan dan tindakan pengguna." },
];

export function AdminDashboard() {
  const students = useSyncExternalStore(subscribeToDemoStudents, getDemoStudents, getDemoStudentsServerSnapshot);
  const kelas = useDemoManagedRows("kelas", getKelasRows(), ["nama", "jurusan", "ketua"]);
  const accounts = useDemoManagedRows("akun", getAccountRows(), ["nama", "email", "role", "kelasId"]);
  const withoutKetua = kelas.filter((k) => !k.ketua).length;
  return (
    <div className="space-y-6">
      <div className="stat-grid [--stat-min:10rem]">
        <StatCard label="Total Siswa" value={students.length} />
        <StatCard label="Total Kelas" value={kelas.length} />
        <StatCard label="Total Akun" value={accounts.length} />
        <StatCard label="Kelas Tanpa Ketua" value={withoutKetua} color={withoutKetua ? "warning" : "success"} />
      </div>
      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`${card} block p-6 hover:border-primary`}>
            <p className="font-semibold">{l.title}</p>
            <p className="mt-1 text-sm text-muted">{l.note}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
