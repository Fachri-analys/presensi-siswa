"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useRole } from "@/components/app-shell";
import { RoleGate } from "@/components/role-gate";
import { btn, card, EmptyState, field, Pagination } from "@/components/ui";
import { getClasses, getHistory, getClass, OWN_CLASS_ID } from "@/lib/mock";
import { currentMonthRange, pct } from "@/lib/stats";
import { getDemoAttendance, getDemoAttendanceServerSnapshot, getStoredAttendanceHistory, subscribeToDemoAttendance } from "@/lib/demo-attendance";
import { getDemoStudents, getDemoStudentsServerSnapshot, subscribeToDemoStudents } from "@/lib/demo-students";

const PAGE_SIZE = 10;
const CELL = "px-4 py-3";
const classes = getClasses();
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default function RiwayatPage() {
  const { role } = useRole();
  const [period] = useState(currentMonthRange);
  const [kelasId, setKelasId] = useState(OWN_CLASS_ID);
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);
  const [page, setPage] = useState(1);
  const attendanceStore = useSyncExternalStore(subscribeToDemoAttendance, getDemoAttendance, getDemoAttendanceServerSnapshot);
  const students = useSyncExternalStore(subscribeToDemoStudents, getDemoStudents, getDemoStudentsServerSnapshot);

  // Ketua Kelas dikunci ke kelasnya; Guru Piket bebas memilih.
  const activeId = role === "KETUA_KELAS" ? OWN_CLASS_ID : kelasId;
  const kelas = getClass(activeId);
  const storedRows = getStoredAttendanceHistory(attendanceStore, activeId, from, to);
  const activeStudentCount = storedRows.length
    ? students.filter((student) => student.kelasId === activeId && student.status === "active").length
    : kelas?.siswa ?? 0;
  const rows = storedRows.length ? storedRows : getHistory(activeId, from, to);
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const totalFor = (key: "hadir" | "izin" | "sakit" | "alpa" | "terlambat") => rows.reduce((sum, row) => sum + row[key], 0);
  const attendanceRate = pct(totalFor("hadir"), rows.length * activeStudentCount);
  const followUpCount = totalFor("izin") + totalFor("sakit") + totalFor("alpa");

  return (
    <RoleGate allow={["KETUA_KELAS", "GURU_PIKET"]}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Riwayat Presensi</h1>
            <p className="mt-1 text-sm text-muted">
              {storedRows.length
                ? "Menampilkan presensi yang tersimpan untuk kelas dan periode ini."
                : "Belum ada presensi tersimpan pada periode ini; contoh data ditampilkan sebagai pratinjau."}
            </p>
          </div>
          {kelas && <p className="rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">{kelas.nama}</p>}
        </div>

        <section aria-label="Ringkasan riwayat" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Hari efektif", value: rows.length, note: "hari sekolah dalam periode" },
            { label: "Rata-rata kehadiran", value: `${attendanceRate}%`, note: "termasuk siswa terlambat" },
            { label: "Total terlambat", value: totalFor("terlambat"), note: "catatan keterlambatan" },
            { label: "Perlu tindak lanjut", value: followUpCount, note: "izin, sakit, dan alpa" },
          ].map((stat) => (
            <div key={stat.label} className={`${card} p-5`}>
              <p className="text-sm font-medium text-muted">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{stat.value}</p>
              <p className="mt-1 text-xs text-muted">{stat.note}</p>
            </div>
          ))}
        </section>

        <section aria-label="Filter riwayat" className={`${card} grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4`}>
          {role !== "KETUA_KELAS" && (
            <label className="grid gap-2 text-sm font-medium">Kelas
              <select value={kelasId} onChange={(e) => { setKelasId(e.target.value); setPage(1); }} className={field}>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
              </select>
            </label>
          )}
          <label className="grid gap-2 text-sm font-medium">Dari tanggal
            <input type="date" value={from} max={to} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={field} />
          </label>
          <label className="grid gap-2 text-sm font-medium">Sampai tanggal
            <input type="date" value={to} min={from} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={field} />
          </label>
          <div className="flex items-end">
            <Link href="/laporan" className={`${btn.outline} w-full`}>Buka laporan</Link>
          </div>
        </section>

        <div className={`${card} overflow-hidden`}>
          {rows.length === 0 ? (
            <EmptyState title="Belum ada riwayat" description="Tidak ada data hari kerja pada rentang tanggal yang dipilih." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-176 text-sm">
                <caption className="sr-only">Riwayat presensi {kelas?.nama} dari {from} sampai {to}</caption>
                <thead>
                  <tr className="bg-primary-soft text-left text-xs font-semibold text-muted">
                    {["Tanggal", "Hadir*", "Izin", "Sakit", "Alpa", "Terlambat", "Kehadiran"].map((h) => <th key={h} scope="col" className={`${CELL} whitespace-nowrap`}>{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visible.map((r) => (
                    <tr key={r.date} className="transition-colors hover:bg-canvas">
                      <td className={`${CELL} whitespace-nowrap font-medium`}><time dateTime={r.date}>{dayLabel(r.date)}</time></td>
                      <td className={`${CELL} text-success`}>{r.hadir}</td>
                      <td className={`${CELL} text-info`}>{r.izin}</td>
                      <td className={`${CELL} text-warning`}>{r.sakit}</td>
                      <td className={`${CELL} text-danger`}>{r.alpa}</td>
                      <td className={CELL}>{r.terlambat}</td>
                      <td className={`${CELL} font-semibold`}>{pct(r.hadir, activeStudentCount)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-line bg-canvas font-semibold">
                  <tr>
                    <th scope="row" className={`${CELL} text-left`}>Total</th>
                    <td className={CELL}>{totalFor("hadir")}</td>
                    <td className={CELL}>{totalFor("izin")}</td>
                    <td className={CELL}>{totalFor("sakit")}</td>
                    <td className={CELL}>{totalFor("alpa")}</td>
                    <td className={CELL}>{totalFor("terlambat")}</td>
                    <td className={CELL}>{attendanceRate}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <p className="border-t border-line px-4 py-3 text-xs text-muted">* Jumlah hadir termasuk siswa yang terlambat.</p>
          {rows.length > PAGE_SIZE && <Pagination page={current} pageSize={PAGE_SIZE} total={rows.length} unit="hari" onChange={setPage} />}
        </div>
      </div>
    </RoleGate>
  );
}
