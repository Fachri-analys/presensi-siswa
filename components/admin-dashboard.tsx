"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  History,
  School,
  ShieldCheck,
  UserCheck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createApiAdminRepository } from "@/lib/data/api-admin";
import { createApiSchoolRepository } from "@/lib/data/api-school";
import { apiErrorMessage } from "@/lib/data/api-client";
import { card, StatCard } from "./ui";

interface AdminLink {
  href: string;
  title: string;
  note: string;
  icon: LucideIcon;
  badge: string;
  tone: "primary" | "info" | "success" | "warning" | "accent";
}

const LINKS: AdminLink[] = [
  {
    href: "/siswa",
    title: "Kelola Siswa",
    note: "Tambah, ubah data, dan pantau status aktif seluruh siswa.",
    icon: Users,
    badge: "Master Data",
    tone: "primary",
  },
  {
    href: "/guru",
    title: "Kelola Guru",
    note: "Tambah, ubah profil, atau nonaktifkan akun data guru.",
    icon: UserCog,
    badge: "Master Data",
    tone: "primary",
  },
  {
    href: "/kelas",
    title: "Kelola Kelas",
    note: "Atur daftar rombel kelas dan tentukan penugasan Ketua Kelas.",
    icon: School,
    badge: "Master Data",
    tone: "primary",
  },
  {
    href: "/monitoring",
    title: "Pantau Presensi",
    note: "Lihat ringkasan dan persentase kehadiran seluruh kelas real-time.",
    icon: Activity,
    badge: "Monitoring",
    tone: "success",
  },
  {
    href: "/presensi",
    title: "Isi Presensi",
    note: "Catat atau koreksi presensi harian siswa untuk kelas mana pun.",
    icon: ClipboardCheck,
    badge: "Operasional",
    tone: "success",
  },
  {
    href: "/riwayat",
    title: "Riwayat Presensi",
    note: "Tinjau presensi harian berdasarkan kelas dan rentang tanggal.",
    icon: History,
    badge: "Rekap",
    tone: "accent",
  },
  {
    href: "/laporan",
    title: "Laporan Presensi",
    note: "Buat, pratinjau, dan cetak laporan presensi bulanan/semester.",
    icon: FileText,
    badge: "Laporan",
    tone: "accent",
  },
  {
    href: "/pengaturan",
    title: "Akun Pengguna",
    note: "Kelola akun pengguna, role hak akses, dan atur ulang kata sandi.",
    icon: ShieldCheck,
    badge: "Konfigurasi",
    tone: "info",
  },
  {
    href: "/log-aktivitas",
    title: "Log Aktivitas",
    note: "Pantau rekaman audit jejak aktivitas dan aksi seluruh pengguna.",
    icon: Activity,
    badge: "Audit",
    tone: "warning",
  },
];

const TONE_STYLES: Record<AdminLink["tone"], string> = {
  primary: "bg-primary-soft text-primary group-hover:bg-primary group-hover:text-white",
  info: "bg-info-soft text-info group-hover:bg-info group-hover:text-white",
  success: "bg-success-soft text-success group-hover:bg-success group-hover:text-white",
  warning: "bg-warning-soft text-warning group-hover:bg-warning group-hover:text-white",
  accent: "bg-accent-soft text-accent group-hover:bg-accent group-hover:text-white",
};

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Beranda Admin</h1>
          <p className="mt-1 text-sm text-muted">Ringkasan sistem presensi siswa dan akses cepat ke seluruh menu manajemen.</p>
        </div>
      </div>

      {error && <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">Gagal memuat ringkasan: {error}</p>}

      <section aria-label="Statistik utama" className="stat-grid [--stat-min:11rem]">
        <StatCard label="Total Siswa" value={counts?.students ?? 0} icon={GraduationCap} />
        <StatCard label="Total Kelas" value={counts?.classes ?? 0} icon={School} />
        <StatCard label="Total Akun" value={counts?.accounts ?? 0} icon={UserCheck} />
        <StatCard
          label="Kelas Tanpa Ketua"
          value={counts?.withoutLeader ?? 0}
          color={counts?.withoutLeader ? "warning" : "success"}
          highlight={Boolean(counts?.withoutLeader)}
          icon={AlertTriangle}
        />
      </section>

      <section aria-label="Menu navigasi manajemen" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Menu Pengelolaan</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LINKS.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`${card} group flex flex-col justify-between p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-sm`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className={`grid size-10 place-items-center rounded-lg transition-colors duration-200 ${TONE_STYLES[l.tone]}`}>
                      <Icon size={20} aria-hidden />
                    </div>
                    <span className="rounded-full bg-canvas px-2.5 py-0.5 text-[11px] font-semibold text-muted border border-line">
                      {l.badge}
                    </span>
                  </div>
                  <p className="mt-3.5 text-base font-semibold text-ink transition-colors group-hover:text-primary">
                    {l.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {l.note}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary pt-2 border-t border-line/60">
                  <span>Buka menu</span>
                  <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
