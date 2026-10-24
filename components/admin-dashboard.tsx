"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createApiAdminRepository } from "@/lib/data/api-admin";
import { createApiSchoolRepository } from "@/lib/data/api-school";
import { apiErrorMessage } from "@/lib/data/api-client";
import { card, StatCard } from "./ui";

const LINKS = [
  { href: "/siswa", title: "Kelola siswa", note: "Tambah, ubah, dan hapus data siswa." },
  { href: "/guru", title: "Kelola guru", note: "Tambah, ubah, hapus, atau nonaktifkan data guru." },
  { href: "/kelas", title: "Kelola kelas", note: "Atur kelas dan tentukan Ketua Kelas." },
  { href: "/pengaturan", title: "Akun pengguna", note: "Kelola akun pengguna." },
  { href: "/monitoring", title: "Pantau presensi", note: "Lihat rekap kehadiran seluruh kelas." },
  { href: "/presensi", title: "Isi presensi", note: "Catat presensi untuk kelas mana pun." },
  { href: "/riwayat", title: "Riwayat presensi", note: "Tinjau presensi harian menurut kelas dan periode." },
  { href: "/laporan", title: "Laporan", note: "Buat dan cetak laporan presensi." },
  { href: "/log-aktivitas", title: "Log aktivitas", note: "Pantau perubahan dan tindakan pengguna." },
];

export function AdminDashboard() {
  const [counts, setCounts] = useState<{ students: number; classes: number; accounts: number; withoutLeader: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.resolve().then(() => {
      const school = createApiSchoolRepository();
      const admin = createApiAdminRepository();
      if (!school || !admin) { setError("Backend belum dikonfigurasi."); return; }
      return Promise.all([
        school.listStudents({ limit: 100, includeInactive: true }),
        school.listClasses(),
        admin.listAccounts({ limit: 100 }),
      ]).then(([students, classes, accounts]) => setCounts({
        students: students.total,
        classes: classes.total,
        accounts: accounts.total,
      withoutLeader: classes.items.filter((item) => !item.ketuaAkunId).length,
    })).catch((err: unknown) => setError(apiErrorMessage(err)));
    });
  }, []);

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">Gagal memuat ringkasan: {error}</p>}
      <div className="stat-grid [--stat-min:10rem]">
        <StatCard label="Total Siswa" value={counts?.students ?? 0} />
        <StatCard label="Total Kelas" value={counts?.classes ?? 0} />
        <StatCard label="Total Akun" value={counts?.accounts ?? 0} />
        <StatCard label="Kelas Tanpa Ketua" value={counts?.withoutLeader ?? 0} color={counts?.withoutLeader ? "warning" : "success"} />
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
