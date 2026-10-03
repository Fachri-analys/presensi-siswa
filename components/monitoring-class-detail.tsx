"use client";

import Link from "next/link";
import { useRole } from "@/components/app-shell";
import { RoleGate } from "@/components/role-gate";
import { btn, StatCard } from "@/components/ui";
import { getDemoStudents, getDemoStudentsServerSnapshot, subscribeToDemoStudents } from "@/lib/demo-students";
import { getDemoAttendance, getDemoAttendanceServerSnapshot, getLocalDateKey, getStoredClassSummary, subscribeToDemoAttendance } from "@/lib/demo-attendance";
import { getClass, getStudents, OWN_CLASS_ID } from "@/lib/mock";
import { StudentTable } from "@/components/student-table";
import { useSyncExternalStore } from "react";

export function MonitoringClassDetail({ classId }: { classId: string }) {
  const { role } = useRole();
  const kelas = getClass(classId);
  const roster = useSyncExternalStore(subscribeToDemoStudents, getDemoStudents, getDemoStudentsServerSnapshot);
  const attendanceStore = useSyncExternalStore(subscribeToDemoAttendance, getDemoAttendance, getDemoAttendanceServerSnapshot);
  const activeRoster = roster.filter((student) => student.kelasId === classId && student.status === "active");
  const today = getLocalDateKey();
  const summary = kelas && getStoredClassSummary(attendanceStore, classId, today, activeRoster.map((student) => student.nis));
  const mockAttendance = getStudents(classId);
  const students = activeRoster.map((student) => {
      const record = attendanceStore[`${today}::${classId}`]?.[student.nis];
      const fallback = mockAttendance.find((item) => item.nis === student.nis);
      return {
        nis: student.nis,
        nama: student.nama,
        status: record ? record.status : fallback?.status ?? null,
        waktu: record ? record.waktu : fallback?.waktu ?? null,
        keterangan: record ? record.keterangan : fallback?.keterangan ?? "",
      };
    });
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
    <RoleGate allow={["GURU_PIKET"]}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted">
              <Link href="/dashboard" className="hover:underline">Monitoring</Link> / Detail Kelas
            </p>
            <h1 className="text-2xl font-semibold leading-tight">{kelas.nama}</h1>
            <p className="text-sm text-muted">Jumlah siswa: {summary?.siswa ?? activeRoster.length} · Data presensi hari ini</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/riwayat?kelas=${kelas.id}`} className={btn.outline}>Riwayat</Link>
            <Link href={`/presensi?kelas=${kelas.id}`} className={btn.primary}>Isi presensi</Link>
          </div>
        </div>

        <div className="stat-grid [--stat-min:7rem]">
          <StatCard label="Hadir" value={summary?.hadir ?? kelas.hadir} color="success" />
          <StatCard label="Izin" value={summary?.izin ?? kelas.izin} color="info" />
          <StatCard label="Sakit" value={summary?.sakit ?? kelas.sakit} color="warning" />
          <StatCard label="Alpa" value={summary?.alpa ?? kelas.alpa} color="danger" />
          <StatCard label="Terlambat" value={summary?.terlambat ?? kelas.terlambat} color="warning" />
        </div>

        <StudentTable students={students} />
      </div>
    </RoleGate>
  );
}
