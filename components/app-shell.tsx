"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Activity, ClipboardCheck, FileText, History, LayoutDashboard, LogOut, Menu, School, SlidersHorizontal, Users, X, type LucideIcon } from "lucide-react";
import { addDemoActivity } from "@/lib/activity-log";
import { clearDemoSession, getDemoSessionRole, getDemoSessionServerSnapshot, subscribeToDemoSession } from "@/lib/demo-session";
import type { Role } from "@/lib/types";
import { Logo } from "./logo";

const ROLES: Record<Role, { label: string; note: string; initials: string }> = {
  KETUA_KELAS: { label: "Ketua Kelas", note: "Kelas XI TKJ 1", initials: "KK" },
  GURU_PIKET: { label: "Guru Piket", note: "Akses seluruh kelas", initials: "GP" },
  ADMIN: { label: "Admin", note: "Akses penuh seluruh fitur", initials: "AD" },
};

const ALL: Role[] = ["KETUA_KELAS", "GURU_PIKET", "ADMIN"];
const NAV: { href: string; label: string; icon: LucideIcon; roles: Role[] }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ALL },
  { href: "/presensi", label: "Presensi", icon: ClipboardCheck, roles: ["KETUA_KELAS", "GURU_PIKET"] },
  { href: "/siswa", label: "Siswa", icon: Users, roles: ["KETUA_KELAS", "GURU_PIKET", "ADMIN"] },
  { href: "/guru", label: "Data Guru", icon: Users, roles: ["ADMIN"] },
  { href: "/kelas", label: "Kelas", icon: School, roles: ["ADMIN"] },
  { href: "/monitoring", label: "Monitoring", icon: Activity, roles: ["GURU_PIKET"] },
  { href: "/riwayat", label: "Riwayat", icon: History, roles: ["KETUA_KELAS", "GURU_PIKET"] },
  { href: "/laporan", label: "Laporan", icon: FileText, roles: ["KETUA_KELAS", "GURU_PIKET"] },
  { href: "/log-aktivitas", label: "Log Aktivitas", icon: History, roles: ["GURU_PIKET"] },
  { href: "/pengaturan", label: "Pengaturan", icon: SlidersHorizontal, roles: ALL },
];

const RoleContext = createContext<{ role: Role } | null>(null);

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole harus dipakai di dalam <AppShell>");
  return ctx;
}

/**
 * Role tersimpan hanya untuk simulasi; otorisasi produksi harus berasal dari sesi server.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const sessionRole = useSyncExternalStore(subscribeToDemoSession, getDemoSessionRole, getDemoSessionServerSnapshot);
  const role = sessionRole ?? "KETUA_KELAS";
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!sessionRole) router.replace("/login");
  }, [router, sessionRole]);
  const items = NAV.filter((item) => role === "ADMIN" || item.roles.includes(role));
  const current = items.find((item) => pathname.startsWith(item.href));
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  function logout() {
    addDemoActivity("Keluar dari aplikasi", `${ROLES[role].label} keluar dari sistem presensi.`);
    clearDemoSession();
    setOpen(false);
    router.replace("/login");
  }

  if (!sessionRole) {
    return (
      <main className="grid min-h-screen place-items-center p-6 text-center" role="status">
        <div>
          <p className="font-semibold">Memeriksa sesi…</p>
          <p className="mt-1 text-sm text-muted">Anda akan diarahkan ke halaman masuk.</p>
        </div>
      </main>
    );
  }

  return (
    <RoleContext value={{ role }}>
      <div className="min-h-screen lg:pl-56 xl:pl-64 print:pl-0">
        {open && <div className="fixed inset-0 z-30 bg-primary/50 lg:hidden" onClick={() => setOpen(false)} />}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col lg:w-56 xl:w-64 bg-primary p-4 transition-transform print:hidden lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="mb-6 flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <Logo size={40} />
              <div>
                <p className="text-sm font-semibold text-white">SMK Negeri 11</p>
                <p className="text-xs text-sky">Sistem Presensi</p>
              </div>
            </div>
            <button type="button" aria-label="Tutup menu" className="text-white lg:hidden" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <nav aria-label="Menu utama" className="flex flex-col gap-1">
            {items.map(({ href, label, icon: Icon }) => {
              const active = current?.href === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-4 rounded-[8px] px-4 py-2.5 text-sm focus-visible:outline-sky ${active ? "bg-sidebar-active font-semibold text-white" : "font-medium text-white/70 hover:bg-white/10"}`}
                >
                  <Icon size={20} className={active ? "text-sky" : "text-white/70"} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={logout}
            className="mt-4 mb-4 flex w-full items-center gap-4 rounded-[8px] px-4 py-2.5 text-sm font-medium text-white/85 hover:bg-white/10"
          >
            <LogOut size={20} aria-hidden />
            Keluar
          </button>

          <div className="mt-auto rounded-[8px] bg-sidebar-chip p-4">
            <p className="text-sm font-semibold text-white">{ROLES[role].label}</p>
            <p className="text-xs text-white/65">{ROLES[role].note}</p>
          </div>
        </aside>

        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 bg-primary px-4 text-white print:hidden md:px-6 lg:h-18 lg:border-b lg:border-line lg:bg-surface xl:px-8 lg:text-ink">
          <button type="button" aria-label="Buka menu" className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="text-center lg:text-left">
            <p className="text-base font-semibold lg:hidden">SMK Negeri 11 Jakarta</p>
            <p className="text-xs text-sky lg:hidden">Sistem Presensi Siswa</p>
            <p className="hidden text-xl font-semibold lg:block">{current?.label ?? "Sistem Presensi Siswa"}</p>
            <p suppressHydrationWarning className="hidden text-sm text-muted lg:block">{today}</p>
          </div>
          <div className="flex items-center gap-6">
            <p className="hidden items-center gap-2 text-xs font-medium text-muted lg:flex">
              <span className="size-2 rounded-full bg-warning" aria-hidden />
              Data simulasi
            </p>
            <div className="hidden size-10 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary sm:grid">
              {ROLES[role].initials}
            </div>
            <button type="button" onClick={logout} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm font-semibold hover:bg-primary-soft" aria-label={`Keluar dari akun ${ROLES[role].label}`}>
              <LogOut size={18} aria-hidden />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 md:p-6 xl:p-8 print:max-w-none print:p-0">{children}</main>
      </div>
    </RoleContext>
  );
}
