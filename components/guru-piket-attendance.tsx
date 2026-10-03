"use client";

import { useState, useSyncExternalStore } from "react";
import { addDemoActivity } from "@/lib/activity-log";
import { getDemoAttendance, getDemoAttendanceServerSnapshot, getLocalDateKey, getLocalTime, saveDemoAttendance, subscribeToDemoAttendance, type DemoAttendanceRecord } from "@/lib/demo-attendance";
import { getDemoStudents, getDemoStudentsServerSnapshot, subscribeToDemoStudents } from "@/lib/demo-students";
import { getClasses } from "@/lib/mock";
import { STATUS_LABEL, type Status, type Student } from "@/lib/types";
import { btn, card, EmptyState, field, StatCard } from "@/components/ui";

const classes = getClasses();
const statuses: Status[] = ["HADIR", "TERLAMBAT", "IZIN", "SAKIT", "ALPA"];
const CELL = "px-4 py-3";

export function GuruPiketAttendance({ initialClassId }: { initialClassId: string }) {
  const [classId, setClassId] = useState(() => classes.some((item) => item.id === initialClassId) ? initialClassId : classes[0].id);
  const [date, setDate] = useState(getLocalDateKey);
  const attendanceStore = useSyncExternalStore(subscribeToDemoAttendance, getDemoAttendance, getDemoAttendanceServerSnapshot);
  const [draft, setDraft] = useState<Record<string, DemoAttendanceRecord> | null>(null);
  const roster = useSyncExternalStore(subscribeToDemoStudents, getDemoStudents, getDemoStudentsServerSnapshot);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const savedAttendance = attendanceStore[`${date}::${classId}`] ?? {};
  const attendance = draft ?? savedAttendance;
  const kelas = classes.find((item) => item.id === classId);
  const students: Student[] = roster
    .filter((student) => student.kelasId === classId && student.status === "active")
    .map((student) => ({
      nis: student.nis,
      nama: student.nama,
      status: attendance[student.nis]?.status ?? null,
      waktu: attendance[student.nis]?.waktu ?? null,
      keterangan: attendance[student.nis]?.keterangan ?? "",
    }));

  const search = query.trim().toLowerCase();
  const filtered = students.filter((student) => !search || `${student.nama} ${student.nis}`.toLowerCase().includes(search));

  const countStatus = (status: Status) => students.filter((student) => student.status === status).length;
  const done = students.filter((student) => student.status !== null).length;
  const remaining = students.length - done;

  function selectClass(nextClassId: string) {
    if (nextClassId === classId) return;
    if (draft && !window.confirm("Perubahan yang belum disimpan akan dibuang. Lanjutkan?")) return;
    setClassId(nextClassId);
    setDraft(null);
    setQuery("");
    setMessage(null);
  }

  function setStudentStatus(nis: string, value: string) {
    const status = statuses.find((option) => option === value);
    setDraft((current) => {
      const next = { ...(current ?? savedAttendance) };
      if (!status) {
        delete next[nis];
        return next;
      }
      next[nis] = {
        status,
        waktu: status === "HADIR" || status === "TERLAMBAT"
          ? (next[nis]?.waktu ?? getLocalTime())
          : null,
        keterangan: next[nis]?.keterangan ?? "",
      };
      return next;
    });
    setMessage(null);
  }

  function saveAttendance() {
    if (!kelas || draft === null) return;
    if (!saveDemoAttendance(classId, date, attendance)) {
      setMessage("Presensi belum berhasil disimpan. Coba lagi beberapa saat.");
      return;
    }
    setDraft(null);
    addDemoActivity(
      "Presensi kelas disimpan",
      `Guru Piket menyimpan presensi ${done} dari ${students.length} siswa kelas ${kelas.nama} untuk ${date}.${remaining ? ` ${remaining} siswa belum diisi.` : ""}`
    );
    setMessage(`Presensi ${done} siswa kelas ${kelas.nama} berhasil disimpan.${remaining ? ` ${remaining} siswa masih belum diisi.` : ""}`);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-primary">Guru Piket</p>
        <h1 className="mt-1 text-2xl font-semibold">Isi Presensi Kelas</h1>
        <p className="mt-1 text-sm text-muted">Pilih kelas, isi status setiap siswa, lalu simpan presensi.</p>
      </div>

      <section aria-label="Pilih kelas dan tanggal" className={`${card} grid gap-4 p-4 sm:grid-cols-[minmax(12rem,20rem)_minmax(10rem,14rem)_1fr] sm:items-end`}>
        <label className="grid gap-2 text-sm font-medium">
          Kelas yang akan diabsen
          <select value={classId} onChange={(event) => selectClass(event.target.value)} className={field}>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.nama} · {item.jurusan}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Tanggal presensi
          <input type="date" value={date} max={getLocalDateKey()} onChange={(event) => {
            if (!event.target.value || event.target.value === date) return;
            if (draft && !window.confirm("Perubahan yang belum disimpan akan dibuang. Lanjutkan?")) return;
            setDate(event.target.value);
            setDraft(null);
            setMessage(null);
          }} className={field} />
        </label>
        <p className="text-sm text-muted">
          {kelas?.nama}: <strong className="text-ink">{students.length} siswa</strong>
          <span className="mx-2" aria-hidden>·</span>
          Diisi <strong className="text-ink">{done}</strong> dari {students.length}
        </p>
      </section>

      <section aria-label="Ringkasan presensi" className="stat-grid [--stat-min:7.5rem]">
        <StatCard label="Sudah diisi" value={done} color="success" />
        <StatCard label="Belum diisi" value={remaining} color={remaining ? "warning" : "success"} highlight={remaining > 0} />
        <StatCard label="Hadir" value={countStatus("HADIR")} color="success" />
        <StatCard label="Terlambat" value={countStatus("TERLAMBAT")} color="warning" />
        <StatCard label="Izin / Sakit / Alpa" value={countStatus("IZIN") + countStatus("SAKIT") + countStatus("ALPA")} color="info" />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className={`${field} flex flex-1 items-center gap-2`}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama atau NIS siswa" aria-label="Cari siswa dalam kelas" className="w-full bg-transparent outline-none" />
        </label>
        <button type="button" onClick={saveAttendance} disabled={draft === null} className={`${btn.primary} w-full sm:w-auto`}>
          Simpan presensi{done > 0 ? ` (${done} siswa)` : ""}
        </button>
      </div>

      {message && <p role={message.startsWith("Presensi belum") ? "alert" : "status"} className={`rounded-md px-4 py-3 text-sm font-medium ${message.startsWith("Presensi belum") ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}>{message}</p>}

      <section aria-label={`Daftar presensi ${kelas?.nama}`} className={`${card} overflow-hidden`}>
        {filtered.length === 0 ? (
          <EmptyState title="Siswa tidak ditemukan" description="Coba cari dengan nama atau NIS yang berbeda." />
        ) : (
          <>
            <div className="divide-y divide-line md:hidden">
              {filtered.map((student) => (
                <div key={student.nis} className="space-y-3 px-4 py-4">
                  <div>
                    <p className="font-semibold">{student.nama}</p>
                    <p className="text-xs text-muted">NIS {student.nis}</p>
                  </div>
                  <label className="grid gap-1 text-xs font-medium text-muted">
                    Status presensi
                    <select value={student.status ?? ""} onChange={(event) => setStudentStatus(student.nis, event.target.value)} className={field}>
                      <option value="">Pilih status</option>
                      {statuses.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
                    </select>
                  </label>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-160 text-sm">
                <thead>
                  <tr className="bg-primary-soft text-left text-xs font-semibold text-muted">
                    <th scope="col" className={CELL}>NIS</th>
                    <th scope="col" className={CELL}>Nama siswa</th>
                    <th scope="col" className={CELL}>Status presensi</th>
                    <th scope="col" className={CELL}>Waktu hadir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((student) => (
                    <tr key={student.nis} className="hover:bg-canvas">
                      <td className={`${CELL} tabular-nums text-muted`}>{student.nis}</td>
                      <td className={`${CELL} font-medium`}>{student.nama}</td>
                      <td className={CELL}>
                        <select aria-label={`Status ${student.nama}`} value={student.status ?? ""} onChange={(event) => setStudentStatus(student.nis, event.target.value)} className={`${field} min-w-44`}>
                          <option value="">Pilih status</option>
                          {statuses.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
                        </select>
                      </td>
                      <td className={`${CELL} text-muted`}>{student.waktu ? `${student.waktu} WIB` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
