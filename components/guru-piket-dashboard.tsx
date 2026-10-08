"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ClipboardCheck, Search } from "lucide-react";
import { getClasses } from "@/lib/mock";
import { getDemoAttendance, getDemoAttendanceServerSnapshot, getLocalDateKey, getStoredClassSummary, subscribeToDemoAttendance } from "@/lib/demo-attendance";
import { getDemoStudents, getDemoStudentsServerSnapshot, subscribeToDemoStudents } from "@/lib/demo-students";
import { classProgress, pct } from "@/lib/stats";
import type { ClassSummary } from "@/lib/types";
import { Badge, btn, card, EmptyState, field, Pagination, StatCard } from "./ui";

const PAGE_SIZE = 8;
const CELL = "px-2 py-3 xl:px-4";
const classes = getClasses();
const jurusanList = [...new Set(classes.map((c) => c.jurusan))];

function Num({ value, color }: { value: number; color: string }) {
  return <td className={`${CELL} text-center font-semibold tabular-nums ${value ? color : "text-muted"}`}>{value}</td>;
}

export function GuruPiketDashboard() {
  const [today] = useState(getLocalDateKey);
  const attendanceStore = useSyncExternalStore(subscribeToDemoAttendance, getDemoAttendance, getDemoAttendanceServerSnapshot);
  const students = useSyncExternalStore(subscribeToDemoStudents, getDemoStudents, getDemoStudentsServerSnapshot);
  const todayClasses = classes.map((kelas) => {
    const activeNis = students.filter((student) => student.kelasId === kelas.id && student.status === "active").map((student) => student.nis);
    const summary = getStoredClassSummary(attendanceStore, kelas.id, today, activeNis);
    return summary ? { ...kelas, ...summary, isExample: false } : { ...kelas, isExample: true };
  });
  const sum = (pick: (c: ClassSummary) => number) => todayClasses.reduce((total, c) => total + pick(c), 0);
  const [query, setQuery] = useState("");
  const [kelasId, setKelasId] = useState("");
  const [jurusan, setJurusan] = useState("");
  const [page, setPage] = useState(1);

  const hadir = sum((c) => c.hadir), izin = sum((c) => c.izin), sakit = sum((c) => c.sakit), alpa = sum((c) => c.alpa);
  const siswa = sum((c) => c.siswa);

  const q = query.trim().toLowerCase();
  const filtered = todayClasses.filter(
    (c) => c.nama.toLowerCase().includes(q) && (!kelasId || c.id === kelasId) && (!jurusan || c.jurusan === jurusan),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  // Setiap filter berubah, kembali ke halaman pertama.
  const onFilter = (set: (value: string) => void) => (e: { target: { value: string } }) => {
    set(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="stat-grid">
        <StatCard label="Total Kelas" value={classes.length} />
        <StatCard label="Total Siswa" value={siswa} />
        <StatCard label="Total Hadir" value={hadir} color="success" />
        <StatCard label="Belum Presensi" value={siswa - hadir - izin - sakit - alpa} color="warning" highlight />
        <StatCard label="Total Izin" value={izin} color="info" />
        <StatCard label="Total Sakit" value={sakit} color="warning" />
        <StatCard label="Total Alpa" value={alpa} color="danger" />
      </div>
      <p className="text-xs text-muted">Jumlah Hadir sudah termasuk siswa yang terlambat; angka terlambat ditampilkan terpisah sebagai rincian.</p>

      <div className="flex flex-wrap items-center gap-4">
        <label className={`${field} flex min-w-52 flex-1 items-center gap-2`}>
          <Search size={16} className="text-muted" aria-hidden />
          <input
            value={query}
            onChange={onFilter(setQuery)}
            placeholder="Cari kelas…"
            aria-label="Cari kelas"
            className="w-full bg-transparent outline-none"
          />
        </label>
        <select aria-label="Filter kelas" value={kelasId} onChange={onFilter(setKelasId)} className={field}>
          <option value="">Semua kelas</option>
          {todayClasses.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
        </select>
        <select aria-label="Filter jurusan" value={jurusan} onChange={onFilter(setJurusan)} className={field}>
          <option value="">Semua jurusan</option>
          {jurusanList.map((j) => <option key={j} value={j}>{j}</option>)}
        </select>
        <Link href="/presensi" className={`${btn.primary} ml-auto`}><ClipboardCheck size={16} aria-hidden /> Isi presensi</Link>
        <Link href="/laporan" className={btn.outline}>Buka laporan</Link>
      </div>

      <div className={`${card} overflow-hidden`}>
        {rows.some((kelas) => kelas.isExample) && (
          <div className="border-b border-line px-4 py-3">
            <Badge tone="warning">Data contoh</Badge>
          </div>
        )}
        {rows.length === 0 ? (
          <EmptyState title="Kelas tidak ditemukan" description="Coba ubah kata kunci atau filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-144 md:min-w-0 text-sm">
              <thead>
                <tr className="bg-primary-soft text-left text-xs font-semibold text-muted">
                  <th scope="col" className={CELL}>Kelas</th>
                  <th scope="col" className={`${CELL} text-center`}>Siswa</th>
                  <th scope="col" className={`${CELL} text-center`}>Hadir</th>
                  <th scope="col" className={`${CELL} text-center`}>Izin</th>
                  <th scope="col" className={`${CELL} text-center`}>Sakit</th>
                  <th scope="col" className={`${CELL} text-center`}>Alpa</th>
                  <th scope="col" className={CELL}>Kehadiran</th>
                  <th scope="col" className={CELL}>Status</th>
                  <th scope="col" className={CELL}><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const p = pct(c.hadir, c.siswa);
                  const progress = classProgress(c);
                  const bar = p >= 85 ? "bg-success" : p >= 60 ? "bg-warning" : "bg-danger";
                  return (
                    <tr key={c.id} className="border-t border-line">
                      <td className={CELL}>
                        <p className="font-semibold">{c.nama}</p>
                        <p className="text-xs text-muted">{c.jurusan}</p>
                      </td>
                      <Num value={c.siswa} color="text-ink" />
                      <Num value={c.hadir} color="text-success" />
                      <Num value={c.izin} color="text-info" />
                      <Num value={c.sakit} color="text-warning" />
                      <Num value={c.alpa} color="text-danger" />
                      <td className={CELL}>
                        <div className="flex items-center gap-2">
                          <div role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={`Kehadiran ${c.nama}`} className="h-2 w-12 overflow-hidden xl:w-24 rounded-full bg-primary-soft">
                            <div className={`h-full ${bar}`} style={{ width: `${p}%` }} />
                          </div>
                          <span className="font-semibold tabular-nums">{p}%</span>
                        </div>
                      </td>
                      <td className={CELL}><Badge tone={progress.tone}>{progress.label}</Badge></td>
                      <td className={CELL}>
                        <div className="flex items-center gap-3">
                          <Link href={`/presensi?kelas=${c.id}`} className="font-semibold text-primary hover:underline">Isi presensi</Link>
                          <Link href={`/monitoring/${c.id}`} className="font-medium text-muted hover:underline">Detail</Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={current} pageSize={PAGE_SIZE} total={filtered.length} unit="kelas" onChange={setPage} />
      </div>
    </div>
  );
}
