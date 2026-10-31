"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClipboardCheck, Search } from "lucide-react";
import { createApiMonitoringRepository } from "@/lib/data/api-monitoring";
import { apiErrorMessage } from "@/lib/data/api-client";
import { getLocalDateKey } from "@/lib/time";
import { classProgress, pct } from "@/lib/stats";
import type { ClassSummary } from "@/lib/types";
import { Badge, btn, card, EmptyState, field, Pagination, StatCard } from "./ui";

type Summary = ClassSummary & { id: string; nama: string; jurusan: string };
const PAGE_SIZE = 8;
const CELL = "px-2 py-3 xl:px-4";
function Num({ value, color }: { value: number; color: string }) { return <td className={`${CELL} text-center font-semibold tabular-nums ${value ? color : "text-muted"}`}>{value}</td>; }

export function GuruPiketDashboard() {
  const [rows, setRows] = useState<Summary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(""); const [kelasId, setKelasId] = useState(""); const [jurusan, setJurusan] = useState(""); const [page, setPage] = useState(1);
  useEffect(() => {
    void Promise.resolve().then(() => {
      const repo = createApiMonitoringRepository();
      if (!repo) { setError("Backend belum dikonfigurasi."); return; }
      return repo.getClassSummary(getLocalDateKey()).then(setRows).catch((err: unknown) => setError(apiErrorMessage(err)));
    });
  }, []);
  const sum = (pick: (item: Summary) => number) => rows.reduce((total, item) => total + pick(item), 0);
  const hadir = sum((c) => c.hadir), izin = sum((c) => c.izin), sakit = sum((c) => c.sakit), alpa = sum((c) => c.alpa), siswa = sum((c) => c.siswa);
  const jurusanList = [...new Set(rows.map((item) => item.jurusan))]; const search = query.trim().toLowerCase();
  const filtered = rows.filter((item) => item.nama.toLowerCase().includes(search) && (!kelasId || item.id === kelasId) && (!jurusan || item.jurusan === jurusan));
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))); const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const onFilter = (setter: (value: string) => void) => (event: { target: { value: string } }) => { setter(event.target.value); setPage(1); };
  return <div className="space-y-6">
    {error && <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">Gagal memuat monitoring: {error}</p>}
    <div className="stat-grid"><StatCard label="Total Kelas" value={rows.length} /><StatCard label="Total Siswa" value={siswa} /><StatCard label="Total Hadir" value={hadir} color="success" /><StatCard label="Belum Presensi" value={siswa - hadir - izin - sakit - alpa} color="warning" highlight /><StatCard label="Total Izin" value={izin} color="info" /><StatCard label="Total Sakit" value={sakit} color="warning" /><StatCard label="Total Alpa" value={alpa} color="danger" /></div>
    <p className="text-xs text-muted">Jumlah Hadir sudah termasuk siswa yang terlambat; angka terlambat ditampilkan terpisah sebagai rincian.</p>
    <div className="flex flex-wrap items-center gap-4"><label className={`${field} flex min-w-52 flex-1 items-center gap-2`}><Search size={16} className="text-muted" aria-hidden /><input value={query} onChange={onFilter(setQuery)} placeholder="Cari kelas…" aria-label="Cari kelas" className="w-full bg-transparent outline-none" /></label><select aria-label="Filter kelas" value={kelasId} onChange={onFilter(setKelasId)} className={field}><option value="">Semua kelas</option>{rows.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}</select><select aria-label="Filter jurusan" value={jurusan} onChange={onFilter(setJurusan)} className={field}><option value="">Semua jurusan</option>{jurusanList.map((j) => <option key={j} value={j}>{j}</option>)}</select><Link href="/presensi" className={`${btn.primary} ml-auto`}><ClipboardCheck size={16} aria-hidden /> Isi presensi</Link><Link href="/laporan" className={btn.outline}>Buka laporan</Link></div>
    <div className={`${card} overflow-hidden`}>{rows.length === 0 && !error ? <EmptyState title="Memuat data monitoring" description="Ringkasan kelas akan tampil setelah backend merespons." /> : visible.length === 0 ? <EmptyState title="Kelas tidak ditemukan" description="Coba ubah kata kunci atau filter." /> : <div className="overflow-x-auto"><table className="w-full min-w-144 md:min-w-0 text-sm"><thead><tr className="bg-primary-soft text-left text-xs font-semibold text-muted">{["Kelas", "Siswa", "Hadir", "Izin", "Sakit", "Alpa", "Kehadiran", "Status", ""].map((label) => <th key={label} className={`${CELL} ${label === "Siswa" || ["Hadir", "Izin", "Sakit", "Alpa"].includes(label) ? "text-center" : ""}`}>{label}</th>)}</tr></thead><tbody>{visible.map((item) => { const percentage = pct(item.hadir, item.siswa); const progress = classProgress(item); const bar = percentage >= 85 ? "text-success" : percentage >= 60 ? "text-warning" : "text-danger"; return <tr key={item.id} className="border-t border-line"><td className={CELL}><p className="font-semibold">{item.nama}</p><p className="text-xs text-muted">{item.jurusan}</p></td><Num value={item.siswa} color="text-ink" /><Num value={item.hadir} color="text-success" /><Num value={item.izin} color="text-info" /><Num value={item.sakit} color="text-warning" /><Num value={item.alpa} color="text-danger" /><td className={CELL}><div className="flex items-center gap-2"><div role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`Kehadiran ${item.nama}`} className="h-2 w-12 overflow-hidden rounded-full bg-primary-soft xl:w-24"><svg className="h-full w-full" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true"><rect className={`fill-current ${bar}`} width={percentage} height="8" /></svg></div><span className="font-semibold tabular-nums">{percentage}%</span></div></td><td className={CELL}><Badge tone={progress.tone}>{progress.label}</Badge></td><td className={CELL}><div className="flex items-center gap-3"><Link href={`/presensi?kelas=${item.id}`} className="font-semibold text-primary hover:underline">Isi presensi</Link><Link href={`/monitoring/${item.id}`} className="font-medium text-muted hover:underline">Detail</Link></div></td></tr>; })}</tbody></table></div>}<Pagination page={current} pageSize={PAGE_SIZE} total={filtered.length} unit="kelas" onChange={setPage} /></div>
  </div>;
}
