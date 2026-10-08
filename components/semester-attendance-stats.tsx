"use client";

import { useMemo, useState } from "react";
import { Search, Calendar } from "lucide-react";
import { getClasses, OWN_CLASS_ID } from "@/lib/mock";
import {
  SEMESTER_OPTIONS,
  getSemesterStudentStats,
  computeSemesterSummary,
  type StudentSemesterStat,
} from "@/lib/semester-stats";
import { useRole } from "@/components/app-shell";
import { Badge, card, EmptyState, field, Pagination, StatCard } from "./ui";

const PAGE_SIZE = 10;
const CELL = "px-4 py-3";

export function SemesterAttendanceStats({ initialClassId }: { initialClassId?: string }) {
  const { role } = useRole();
  const classes = getClasses();
  const isKetuaKelas = role === "KETUA_KELAS";

  const defaultClassId = isKetuaKelas ? OWN_CLASS_ID : (initialClassId ?? "all");
  const [selectedSemester, setSelectedSemester] = useState<string>(SEMESTER_OPTIONS[0].id);
  const [selectedClass, setSelectedClass] = useState<string>(defaultClassId);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const currentSemester = useMemo(
    () => SEMESTER_OPTIONS.find((s) => s.id === selectedSemester) ?? SEMESTER_OPTIONS[0],
    [selectedSemester]
  );

  // Ambil data semester berdasarkan filter kelas
  const allStats = useMemo(() => {
    return getSemesterStudentStats(selectedSemester, isKetuaKelas ? OWN_CLASS_ID : selectedClass);
  }, [selectedSemester, selectedClass, isKetuaKelas]);

  // Hitung summary sebelum filter search agar menggambarkan total keseluruhan kelas/semester
  const summary = useMemo(() => computeSemesterSummary(allStats), [allStats]);

  // Filter berdasarkan pencarian nama atau NIS
  const filteredStats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allStats;
    return allStats.filter(
      (s) => s.nama.toLowerCase().includes(q) || s.nis.includes(q) || s.kelasNama.toLowerCase().includes(q)
    );
  }, [allStats, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredStats.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = filteredStats.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleFilterChange(callback: () => void) {
    callback();
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Statistik Kehadiran Siswa per Semester</h2>
          <p className="mt-1 text-sm text-muted">
            Akumulasi kehadiran per siswa untuk 1 semester: Hadir, Izin, Sakit, Alpa, dan Total Kehadiran.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="accent">Mock Data</Badge>
          <span className="text-xs text-muted">
            {currentSemester.periode} ({currentSemester.totalHariEfektif} hari efektif)
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <section
        aria-label="Filter statistik semester"
        className={`${card} grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3`}
      >
        <label className="grid gap-2 text-sm font-medium">
          <span className="flex items-center gap-1.5 text-muted">
            <Calendar size={14} aria-hidden /> Pilih Semester
          </span>
          <select
            value={selectedSemester}
            onChange={(e) => handleFilterChange(() => setSelectedSemester(e.target.value))}
            className={field}
          >
            {SEMESTER_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {!isKetuaKelas && (
          <label className="grid gap-2 text-sm font-medium">
            <span className="text-muted">Pilih Kelas</span>
            <select
              value={selectedClass}
              onChange={(e) => handleFilterChange(() => setSelectedClass(e.target.value))}
              className={field}
            >
              <option value="all">Semua Kelas ({classes.length} kelas)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama} · {c.jurusan}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className={`grid gap-2 text-sm font-medium ${isKetuaKelas ? "sm:col-span-1" : ""}`}>
          <span className="text-muted">Cari Siswa</span>
          <div className={`${field} flex items-center gap-2`}>
            <Search size={16} className="text-muted" aria-hidden />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleFilterChange(() => setSearchQuery(e.target.value))}
              placeholder="Cari nama atau NIS siswa..."
              className="w-full bg-transparent outline-none"
            />
          </div>
        </label>
      </section>

      {/* Summary Cards */}
      <section aria-label="Ringkasan statistik semester" className="stat-grid [--stat-min:8rem]">
        <StatCard label="Total Siswa" value={summary.totalSiswa} />
        <StatCard label="Rata-rata Kehadiran" value={summary.rataRataKehadiran} color="success" />
        <StatCard label="Akumulasi Hadir" value={summary.totalHadir} color="success" />
        <StatCard label="Akumulasi Izin" value={summary.totalIzin} color="info" />
        <StatCard label="Akumulasi Sakit" value={summary.totalSakit} color="warning" />
        <StatCard label="Akumulasi Alpa" value={summary.totalAlpa} color="danger" />
      </section>
      <p className="text-xs text-muted">
        Rata-rata kehadiran dihitung dari total kehadiran siswa dibandingkan {currentSemester.totalHariEfektif} hari efektif sekolah pada {currentSemester.label}.
      </p>

      {/* Table Data */}
      <section aria-label="Tabel statistik kehadiran siswa semester" className={`${card} overflow-hidden`}>
        {filteredStats.length === 0 ? (
          <EmptyState
            title="Data siswa tidak ditemukan"
            description="Tidak ada data siswa yang cocok dengan filter atau kata kunci pencarian Anda."
          />
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="divide-y divide-line md:hidden">
              {paginatedRows.map((item: StudentSemesterStat) => (
                <div key={item.nis} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink text-sm">{item.nama}</p>
                      <p className="text-xs text-muted">
                        NIS {item.nis} · {item.kelasNama}
                      </p>
                    </div>
                    <Badge tone={item.persentase >= 90 ? "success" : item.persentase >= 75 ? "warning" : "danger"}>
                      {item.persentase}% Kehadiran
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 rounded-md bg-canvas p-2.5 text-center text-xs">
                    <div>
                      <p className="text-muted text-[11px]">Hadir</p>
                      <p className="font-semibold text-success tabular-nums mt-0.5">{item.hadir}</p>
                    </div>
                    <div>
                      <p className="text-muted text-[11px]">Izin</p>
                      <p className="font-semibold text-info tabular-nums mt-0.5">{item.izin}</p>
                    </div>
                    <div>
                      <p className="text-muted text-[11px]">Sakit</p>
                      <p className="font-semibold text-warning tabular-nums mt-0.5">{item.sakit}</p>
                    </div>
                    <div>
                      <p className="text-muted text-[11px]">Alpa</p>
                      <p className="font-semibold text-danger tabular-nums mt-0.5">{item.alpa}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted pt-1">
                    <span>Total Kehadiran:</span>
                    <strong className="text-ink tabular-nums">
                      {item.totalKehadiran} / {item.totalHariEfektif} hari ({item.persentase}%)
                    </strong>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-192 text-sm">
                <thead>
                  <tr className="bg-primary-soft text-left text-xs font-semibold text-muted">
                    <th scope="col" className={`${CELL} w-12 text-center`}>
                      No
                    </th>
                    <th scope="col" className={`${CELL} w-28`}>
                      NIS
                    </th>
                    <th scope="col" className={CELL}>
                      Nama Siswa
                    </th>
                    <th scope="col" className={`${CELL} w-36`}>
                      Kelas
                    </th>
                    <th scope="col" className={`${CELL} w-20 text-center`}>
                      Hadir
                    </th>
                    <th scope="col" className={`${CELL} w-20 text-center`}>
                      Izin
                    </th>
                    <th scope="col" className={`${CELL} w-20 text-center`}>
                      Sakit
                    </th>
                    <th scope="col" className={`${CELL} w-20 text-center`}>
                      Alpa
                    </th>
                    <th scope="col" className={`${CELL} w-44 text-center`}>
                      Total Kehadiran
                    </th>
                    <th scope="col" className={`${CELL} w-28 text-center`}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paginatedRows.map((item: StudentSemesterStat, index: number) => {
                    const rowNumber = (currentPage - 1) * PAGE_SIZE + index + 1;
                    const tone =
                      item.persentase >= 90 ? "success" : item.persentase >= 80 ? "info" : item.persentase >= 75 ? "warning" : "danger";
                    const statusLabel =
                      item.persentase >= 90 ? "Sangat Baik" : item.persentase >= 80 ? "Baik" : item.persentase >= 75 ? "Cukup" : "Kurang";

                    return (
                      <tr key={item.nis} className="hover:bg-canvas transition-colors">
                        <td className={`${CELL} text-center text-muted tabular-nums`}>{rowNumber}</td>
                        <td className={`${CELL} text-muted tabular-nums`}>{item.nis}</td>
                        <td className={`${CELL} font-semibold text-ink`}>{item.nama}</td>
                        <td className={`${CELL} text-muted`}>{item.kelasNama}</td>
                        <td className={`${CELL} text-center font-semibold text-success tabular-nums`}>
                          {item.hadir}
                        </td>
                        <td className={`${CELL} text-center font-semibold text-info tabular-nums`}>
                          {item.izin}
                        </td>
                        <td className={`${CELL} text-center font-semibold text-warning tabular-nums`}>
                          {item.sakit}
                        </td>
                        <td className={`${CELL} text-center font-semibold text-danger tabular-nums`}>
                          {item.alpa}
                        </td>
                        <td className={`${CELL} text-center`}>
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="font-semibold text-ink tabular-nums">
                              {item.totalKehadiran} hari
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-muted">
                              <div
                                role="progressbar"
                                aria-valuenow={item.persentase}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`Persentase kehadiran ${item.nama}`}
                                className="h-1.5 w-16 overflow-hidden rounded-full bg-primary-soft"
                              >
                                <div
                                  className={`h-full ${item.persentase >= 85 ? "bg-success" : item.persentase >= 75 ? "bg-warning" : "bg-danger"}`}
                                  style={{ width: `${item.persentase}%` }}
                                />
                              </div>
                              <span className="tabular-nums font-medium">{item.persentase}%</span>
                            </div>
                          </div>
                        </td>
                        <td className={`${CELL} text-center`}>
                          <Badge tone={tone}>{statusLabel}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredStats.length > PAGE_SIZE && (
              <Pagination
                page={currentPage}
                pageSize={PAGE_SIZE}
                total={filteredStats.length}
                unit="siswa"
                onChange={setPage}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
