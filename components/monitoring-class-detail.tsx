"use client";

import Link from "next/link";
import { useRole } from "@/components/app-shell";
import { RoleGate } from "@/components/role-gate";
import { btn, StatCard } from "@/components/ui";
import { getDemoStudents, getDemoStudentsServerSnapshot, subscribeToDemoStudents } from "@/lib/demo-students";
import { getDemoAttendance, getDemoAttendanceServerSnapshot, getLocalDateKey, subscribeToDemoAttendance } from "@/lib/demo-attendance";
import { getClass, OWN_CLASS_ID } from "@/lib/mock";
import { StudentTable } from "@/components/student-table";
import { useSyncExternalStore } from "react";

export function MonitoringClassDetail({ classId }: { classId: string }) {
  const { role } = useRole();
  const kelas = getClass(classId);
  const roster = useSyncExternalStore(subscribeToDemoStudents, getDemoStudents, getDemoStudentsServerSnapshot);
  const attendanceStore = useSyncExternalStore(subscribeToDemoAttendance, getDemoAttendance, getDemoAttendanceServerSnapshot);
  const activeRoster = roster.filter((student) => student.kelasId === classId && student.status === "active");
  const today = getLocalDateKey();
  const students = activeRoster.map((student) => {
      const record = attendanceStore[`${today}::${classId}`]?.[student.nis];
      return {
        nis: student.nis,
        nama: student.nama,
        status: record?.status ?? null,
        waktu: record?.waktu ?? null,
        keterangan: record?.keterangan ?? "",
      };
    });
  const summary = {
    siswa: students.length,
    hadir: students.filter((student) => student.status === "HADIR" || student.status === "TERLAMBAT").length,
    izin: students.filter((student) => student.status === "IZIN").length,
    sakit: students.filter((student) => student.status === "SAKIT").length,
    alpa: students.filter((student) => student.status === "ALPA").length,
    terlambat: students.filter((student) => student.status === "TERLAMBAT").length,
  };
  const allowedForRole = role !== "KETUA_KELAS" || classId === OWN_CLASS_ID;

  if (!kelas || !allowedForRole) {
    return (
      <RoleGate allow={["KETUA_KELAS", "GURU_PIKET"]}>
        <div className="space-y-4">
          <p>Halaman kelas tidak ditemukan.</p>
          <Link href="/dashboard" className={btn.outline}>Kembali ke dashboard</Link>
        </div>
      </RoleGate>
    );
  }

  return (
    <RoleGate allow={["KETUA_KELAS", "GURU_PIKET"]}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted">
              <Link href={role === "KETUA_KELAS" ? "/dashboard" : "/monitoring"} className="hover:underline">Monitoring</Link> / Detail Kelas
            </p>
            <h1 className="text-2xl font-semibold leading-tight">{kelas.nama}</h1>
            <p className="text-sm text-muted">Jumlah siswa: {summary.siswa} · Data presensi hari ini</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/riwayat?kelas=${kelas.id}`} className={btn.outline}>Riwayat</Link>
            <Link href={`/presensi?kelas=${kelas.id}`} className={btn.primary}>Isi presensi</Link>
          </div>
        </div>

        <div className="stat-grid [--stat-min:7rem]">
          <StatCard label="Hadir" value={summary.hadir} color="success" />
          <StatCard label="Izin" value={summary.izin} color="info" />
          <StatCard label="Sakit" value={summary.sakit} color="warning" />
          <StatCard label="Alpa" value={summary.alpa} color="danger" />
          <StatCard label="Terlambat" value={summary.terlambat} color="warning" />
        </div>

        <StudentTable students={students} />
      </div>
    </RoleGate>
  );
}
