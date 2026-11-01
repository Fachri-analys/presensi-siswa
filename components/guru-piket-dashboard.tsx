"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ClipboardCheck,
  Clock,
  Eye,
  FileText,
  HeartPulse,
  Info,
  School,
  Search,
  UserCheck,
  Users,
  UserX,
  X,
} from "lucide-react";
import { createApiMonitoringRepository } from "@/lib/data/api-monitoring";
import { apiErrorMessage } from "@/lib/data/api-client";
import { getLocalDateKey } from "@/lib/time";
import { classProgress, pct } from "@/lib/stats";
import type { ClassSummary } from "@/lib/types";
import { Badge, btn, card, EmptyState, field, Pagination, StatCard } from "./ui";

type Summary = ClassSummary & { id: string; nama: string; jurusan: string };
const PAGE_SIZE = 8;
const CELL = "px-3 py-3 xl:px-4";

function Num({ value, color }: { value: number; color: string }) {
  return (
    <td className={`${CELL} text-center font-semibold tabular-nums ${value ? color : "text-muted"}`}>
      {value}
    </td>
  );
}

export function GuruPiketDashboard() {
  const [rows, setRows] = useState<Summary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kelasId, setKelasId] = useState("");
  const [jurusan, setJurusan] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    void Promise.resolve().then(() => {
      const repo = createApiMonitoringRepository();
      if (!repo) {
        setError("Backend belum dikonfigurasi.");
        return;
      }
      return repo
        .getClassSummary(getLocalDateKey())
        .then(setRows)
        .catch((err: unknown) => setError(apiErrorMessage(err)));
    });
  }, []);

  const sum = (pick: (item: Summary) => number) => rows.reduce((total, item) => total + pick(item), 0);
  const hadir = sum((c) => c.hadir);
  const izin = sum((c) => c.izin);
  const sakit = sum((c) => c.sakit);
  const alpa = sum((c) => c.alpa);
  const siswa = sum((c) => c.siswa);
  const belum = Math.max(0, siswa - hadir - izin - sakit - alpa);

  const jurusanList = [...new Set(rows.map((item) => item.jurusan))];
  const search = query.trim().toLowerCase();
  const filtered = rows.filter(
    (item) =>
      item.nama.toLowerCase().includes(search) &&
      (!kelasId || item.id === kelasId) &&
      (!jurusan || item.jurusan === jurusan)
  );

  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const onFilter = (setter: (value: string) => void) => (event: { target: { value: string } }) => {
    setter(event.target.value);
    setPage(1);
  };

  const isFiltered = Boolean(query || kelasId || jurusan);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
              Guru Piket
            </span>
            <span className="text-xs text-muted">Akses Monitoring Seluruh Kelas</span>
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">Monitoring Presensi Harian</h1>
          <p className="mt-1 text-sm text-muted">
            Pantau rekapitulasi kehadiran seluruh kelas secara real-time dan kelola absensi harian sekolah.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/presensi" className={btn.primary}>
            <ClipboardCheck size={16} aria-hidden />
            <span>Isi Presensi</span>
          </Link>
          <Link href="/laporan" className={btn.outline}>
            <FileText size={16} aria-hidden />
            <span>Buka Laporan</span>
          </Link>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
          Gagal memuat monitoring: {error}
        </p>
      )}

      {/* KPI Stat Cards with Icons */}
      <section aria-label="Statistik kehadiran hari ini" className="space-y-3">
        <div className="stat-grid [--stat-min:9.5rem]">
          <StatCard label="Total Kelas" value={rows.length} icon={School} />
          <StatCard label="Total Siswa" value={siswa} icon={Users} />
          <StatCard label="Total Hadir" value={hadir} color="success" icon={UserCheck} />
          <StatCard
            label="Belum Presensi"
            value={belum}
            color={belum > 0 ? "warning" : "success"}
            highlight={belum > 0}
            icon={Clock}
          />
          <StatCard label="Total Izin" value={izin} color="info" icon={FileText} />
          <StatCard label="Total Sakit" value={sakit} color="warning" icon={HeartPulse} />
          <StatCard label="Total Alpa" value={alpa} color="danger" icon={UserX} />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Info size={14} className="shrink-0 text-muted" aria-hidden />
          <span>Jumlah Hadir sudah termasuk siswa yang terlambat; rincian siswa terlambat dapat dilihat di halaman detail kelas.</span>
        </div>
      </section>

      {/* Search & Filter Controls */}
      <section aria-label="Filter dan pencarian kelas" className={`${card} p-3.5 sm:p-4`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className={`${field} flex flex-1 items-center gap-2 bg-canvas/70`}>
            <Search size={16} className="text-muted shrink-0" aria-hidden />
            <input
              value={query}
              onChange={onFilter(setQuery)}
              placeholder="Cari nama kelas atau jurusan…"
              aria-label="Cari kelas"
              className="w-full bg-transparent outline-none"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter kelas"
              value={kelasId}
              onChange={onFilter(setKelasId)}
              className={`${field} bg-canvas/70 min-w-36`}
            >
              <option value="">Semua kelas</option>
              {rows.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter jurusan"
              value={jurusan}
              onChange={onFilter(setJurusan)}
              className={`${field} bg-canvas/70 min-w-36`}
            >
              <option value="">Semua jurusan</option>
              {jurusanList.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setKelasId("");
                  setJurusan("");
                  setPage(1);
                }}
                className="inline-flex h-10 items-center gap-1 rounded-md px-3 text-xs font-semibold text-danger hover:bg-danger-soft transition-colors pointer-coarse:h-12"
              >
                <X size={14} aria-hidden />
                <span>Reset filter</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Monitoring Table */}
      <section aria-label="Tabel monitoring kehadiran kelas" className={`${card} overflow-hidden`}>
        {rows.length === 0 && !error ? (
          <EmptyState
            title="Memuat data monitoring"
            description="Ringkasan kelas akan tampil setelah backend merespons data kehadiran."
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title="Kelas tidak ditemukan"
            description="Tidak ada kelas yang cocok dengan kata kunci atau filter yang Anda pilih."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-sm">
              <thead>
                <tr className="bg-primary-soft text-left text-xs font-semibold text-muted">
                  <th scope="col" className={CELL}>Kelas &amp; Jurusan</th>
                  <th scope="col" className={`${CELL} text-center`}>Siswa</th>
                  <th scope="col" className={`${CELL} text-center`}>Hadir</th>
                  <th scope="col" className={`${CELL} text-center`}>Izin</th>
                  <th scope="col" className={`${CELL} text-center`}>Sakit</th>
                  <th scope="col" className={`${CELL} text-center`}>Alpa</th>
                  <th scope="col" className={CELL}>Kehadiran</th>
                  <th scope="col" className={CELL}>Status</th>
                  <th scope="col" className={`${CELL} text-right`}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((item) => {
                  const percentage = pct(item.hadir, item.siswa);
                  const progress = classProgress(item);
                  const bar =
                    percentage >= 85
                      ? "text-success"
                      : percentage >= 60
                      ? "text-warning"
                      : "text-danger";

                  return (
                    <tr key={item.id} className="hover:bg-canvas/50 transition-colors">
                      <td className={CELL}>
                        <p className="font-semibold text-ink">{item.nama}</p>
                        <p className="text-xs text-muted">{item.jurusan}</p>
                      </td>
                      <Num value={item.siswa} color="text-ink" />
                      <Num value={item.hadir} color="text-success" />
                      <Num value={item.izin} color="text-info" />
                      <Num value={item.sakit} color="text-warning" />
                      <Num value={item.alpa} color="text-danger" />
                      <td className={CELL}>
                        <div className="flex items-center gap-2.5">
                          <div
                            role="progressbar"
                            aria-valuenow={percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Kehadiran ${item.nama}`}
                            className="h-2 w-14 overflow-hidden rounded-full bg-primary-soft xl:w-24"
                          >
                            <svg className="h-full w-full" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
                              <rect className={`fill-current ${bar}`} width={percentage} height="8" />
                            </svg>
                          </div>
                          <span className="font-semibold tabular-nums text-xs">{percentage}%</span>
                        </div>
                      </td>
                      <td className={CELL}>
                        <Badge tone={progress.tone}>{progress.label}</Badge>
                      </td>
                      <td className={`${CELL} text-right`}>
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/presensi?kelas=${item.id}`}
                            className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-colors"
                          >
                            <ClipboardCheck size={13} aria-hidden />
                            <span>Isi presensi</span>
                          </Link>
                          <Link
                            href={`/monitoring/${item.id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs font-medium text-muted hover:bg-canvas hover:text-ink transition-colors"
                          >
                            <Eye size={13} aria-hidden />
                            <span>Detail</span>
                          </Link>
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
      </section>
    </div>
  );
}
