"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRole } from "@/components/app-shell";
import { RoleGate } from "@/components/role-gate";
import { btn, card, EmptyState, field, Pagination } from "@/components/ui";
import { createApiSchoolRepository } from "@/lib/data/api-school";
import { apiErrorMessage } from "@/lib/data/api-client";
import type { SchoolClass } from "@/lib/data/contracts";
import { currentMonthRange, isValidDateRange, pct } from "@/lib/stats";
import { createApiAttendanceRepository } from "@/lib/data/api-attendance";
import type { HistoryRow } from "@/lib/data/contracts";

const PAGE_SIZE = 10;
const CELL = "px-4 py-3";
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function RiwayatContent() {
  const { role, kelasId: sessionClassId } = useRole();
  const searchParams = useSearchParams();
  const requestedClassId = searchParams.get("kelas");
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const defaultClassId = sessionClassId ?? "";
  const [period] = useState(currentMonthRange);
  const [kelasId, setKelasId] = useState("");
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);
  const invalidDateRange = !isValidDateRange(from, to);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [activeStudentCount, setActiveStudentCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.resolve().then(() => {
      const repo = createApiSchoolRepository();
      if (!repo) { setError("Backend belum dikonfigurasi."); return; }
      return repo.listClasses().then((page) => {
        setClasses(page.items);
        const selected = page.items.find((item) => item.id === requestedClassId)?.id ?? sessionClassId ?? page.items[0]?.id ?? "";
        setKelasId(selected);
      }).catch((err: unknown) => setError(apiErrorMessage(err)));
    });
  }, [requestedClassId, sessionClassId]);

  // Ketua Kelas dikunci ke kelasnya; Guru Piket bebas memilih.
  const activeId = role === "KETUA_KELAS" ? (sessionClassId ?? defaultClassId) : kelasId;
  const kelas = classes.find((item) => item.id === activeId);

  useEffect(() => {
    let active = true;
    async function loadHistory() {
      await Promise.resolve();
      if (!active) return;
      const repo = createApiAttendanceRepository();
      if (!repo || !activeId || !from || !to || invalidDateRange) {
        if (active) setRows([]);
        return;
      }
      try {
        const history = await repo.getHistory({ kelasId: activeId, from, to });
        if (active) { setRows(history); setError(null); }
      } catch (err: unknown) {
        if (active) { setRows([]); setError(apiErrorMessage(err)); }
      }
    }
    void loadHistory();
    return () => {
      active = false;
    };
  }, [activeId, from, to, invalidDateRange]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      const repo = createApiSchoolRepository();
      if (!repo || !activeId) { setActiveStudentCount(0); return; }
      return repo.listStudents({ kelasId: activeId, status: "active", limit: 1 }).then((page) => setActiveStudentCount(page.total)).catch((err: unknown) => setError(apiErrorMessage(err)));
    });
  }, [activeId]);

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
              Menampilkan presensi yang tersimpan untuk kelas dan periode ini.
            </p>
          </div>
          {kelas && <p className="rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">{kelas.nama}</p>}
        </div>
        {error && <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">Gagal memuat riwayat: {error}</p>}

        <section aria-label="Ringkasan riwayat" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Hari tercatat", value: rows.length, note: "hari dengan catatan presensi tersimpan" },
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
            <EmptyState title={invalidDateRange ? "Rentang tanggal tidak valid" : "Belum ada riwayat"} description={invalidDateRange ? "Pilih rentang tanggal yang benar, maksimal 366 hari." : "Tidak ada data hari kerja pada rentang tanggal yang dipilih."} />
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

export default function RiwayatPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Memuat riwayat presensi…</p>}>
      <RiwayatContent />
    </Suspense>
  );
}
