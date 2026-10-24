"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRole } from "@/components/app-shell";
import { RoleGate } from "@/components/role-gate";
import { btn, EmptyState, StatCard } from "@/components/ui";
import { createApiSchoolRepository } from "@/lib/data/api-school";
import { createApiMonitoringRepository } from "@/lib/data/api-monitoring";
import { apiErrorMessage } from "@/lib/data/api-client";
import { getLocalDateKey } from "@/lib/time";
import type { SchoolClass, SchoolStudent, AttendanceRecord } from "@/lib/data/contracts";
import { StudentTable } from "@/components/student-table";

export function MonitoringClassDetail({ classId }: { classId: string; initialClass?: { id: string; nama: string } }) {
  const { role, kelasId: sessionClassId } = useRole();
  const [kelas, setKelas] = useState<SchoolClass | null>(null);
  const [roster, setRoster] = useState<SchoolStudent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      const school = createApiSchoolRepository(); const monitoring = createApiMonitoringRepository();
      if (!school || !monitoring) { setError("Backend belum dikonfigurasi."); return; }
      return Promise.all([school.getClass(classId), school.listStudents({ kelasId: classId, status: "active", limit: 100 }), monitoring.getClassAttendance(classId, getLocalDateKey())])
        .then(([classItem, studentsPage, records]) => { if (active) { setKelas(classItem); setRoster(studentsPage.items); setAttendance(records); setError(null); } })
        .catch((err: unknown) => { if (active) setError(apiErrorMessage(err)); });
    });
    return () => { active = false; };
  }, [classId]);

  const byNis = new Map(attendance.map((record) => [record.nis, record]));
  const students = roster.map((student) => { const record = byNis.get(student.nis); return { nis: student.nis, nama: student.nama, status: record?.status ?? null, waktu: record?.waktu ?? null, keterangan: record?.keterangan ?? "" }; });
  const summary = { siswa: students.length, hadir: students.filter((s) => s.status === "HADIR" || s.status === "TERLAMBAT").length, izin: students.filter((s) => s.status === "IZIN").length, sakit: students.filter((s) => s.status === "SAKIT").length, alpa: students.filter((s) => s.status === "ALPA").length, terlambat: students.filter((s) => s.status === "TERLAMBAT").length };
  const allowedForRole = role !== "KETUA_KELAS" || classId === sessionClassId;
  if (!allowedForRole) return <RoleGate allow={["KETUA_KELAS", "GURU_PIKET"]}><p role="alert" className="text-danger">Kelas ini bukan kelas tugas Anda.</p></RoleGate>;
  if (!kelas) return <RoleGate allow={["KETUA_KELAS", "GURU_PIKET"]}><div className="space-y-4">{error && <p role="alert" className="text-danger">Gagal memuat kelas: {error}</p>}<EmptyState title="Kelas belum tersedia" description="Data kelas akan tampil setelah backend merespons." /><Link href="/dashboard" className={btn.outline}>Kembali ke dashboard</Link></div></RoleGate>;
  return <RoleGate allow={["KETUA_KELAS", "GURU_PIKET"]}><div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-medium text-muted"><Link href={role === "KETUA_KELAS" ? "/dashboard" : "/monitoring"} className="hover:underline">Monitoring</Link> / Detail Kelas</p><h1 className="text-2xl font-semibold leading-tight">{kelas.nama}</h1><p className="text-sm text-muted">Jumlah siswa aktif: {summary.siswa} · Data presensi hari ini</p></div><div className="flex gap-2"><Link href={`/riwayat?kelas=${kelas.id}`} className={btn.outline}>Riwayat</Link><Link href={`/presensi?kelas=${kelas.id}`} className={btn.primary}>Isi presensi</Link></div></div>
    {error && <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
    <div className="stat-grid [--stat-min:7rem]"><StatCard label="Hadir" value={summary.hadir} color="success" /><StatCard label="Izin" value={summary.izin} color="info" /><StatCard label="Sakit" value={summary.sakit} color="warning" /><StatCard label="Alpa" value={summary.alpa} color="danger" /><StatCard label="Terlambat" value={summary.terlambat} color="warning" /></div><StudentTable students={students} />
  </div></RoleGate>;
}
