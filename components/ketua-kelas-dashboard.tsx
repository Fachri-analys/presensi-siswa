"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { getDemoStudents, getDemoStudentsServerSnapshot, subscribeToDemoStudents } from "@/lib/demo-students";
import { getDemoAttendance, getDemoAttendanceServerSnapshot, getLocalDateKey, getLocalTime, saveDemoAttendance, subscribeToDemoAttendance, type DemoAttendanceRecord } from "@/lib/demo-attendance";
import { addDemoActivity } from "@/lib/activity-log";
import { getAccountRows, getClass, OWN_CLASS_ID } from "@/lib/mock";
import { STATUS_LABEL, type Status, type Student } from "@/lib/types";
import { Dialog } from "./dialog";
import { StudentTable } from "./student-table";
import { btn, field, StatCard, StatusBadge } from "./ui";

// Ketua Kelas hanya melihat kelasnya sendiri. ID ini mock; di produksi diambil dari sesi
// dan pembatasan aksesnya tetap dipaksakan di backend.
const PRESENT: Status[] = ["HADIR", "TERLAMBAT"];

type DialogState = { kind: "form" | "detail" | "delete"; nis?: string } | null;

const isStatus = (value: string): value is Status => Object.hasOwn(STATUS_LABEL, value);

function IconButton({ label, onClick, danger, disabled, children }: { label: string; onClick: () => void; danger?: boolean; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-10 pointer-coarse:size-12 place-items-center rounded-md hover:bg-primary-soft disabled:opacity-30 ${danger ? "text-danger" : "text-muted hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

interface FormProps {
  options: Student[];
  target?: Student;
  onSubmit: (nis: string, status: Status, keterangan: string) => void;
  onCancel: () => void;
}

function PresensiForm({ options, target, onSubmit, onCancel }: FormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const data = new FormData(e.currentTarget);
    const nis = String(data.get("nis") ?? "");
    const value = String(data.get("status") ?? "");
    if (!options.some((student) => student.nis === nis) || !isStatus(value)) {
      setFormError("Pilih siswa dan status presensi yang tersedia.");
      return;
    }
    onSubmit(nis, value, String(data.get("keterangan") ?? "").trim());
  }
  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
      <label className="grid gap-2 text-sm font-medium">
        Siswa
        <select name="nis" defaultValue={target?.nis ?? ""} className={field}>
          {!target && <option value="" disabled>Pilih siswa</option>}
          {(target ? [target] : options).map((s) => <option key={s.nis} value={s.nis}>{s.nama} ({s.nis})</option>)}
        </select>
      </label>
      {formError && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
      <label className="grid gap-2 text-sm font-medium">
        Status
        <select name="status" defaultValue={target?.status ?? ""} className={field}>
          <option value="" disabled>Pilih status</option>
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Keterangan
        <input name="keterangan" maxLength={120} defaultValue={target?.keterangan} placeholder="Opsional" className={field} />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={btn.outline}>Batal</button>
        <button type="submit" className={btn.primary}>Simpan presensi</button>
      </div>
    </form>
  );
}

export function KetuaKelasDashboard() {
  const kelas = getClass(OWN_CLASS_ID);
  const ketuaName = getAccountRows().find((account) => account.role === "KETUA_KELAS" && account.kelasId === OWN_CLASS_ID)?.nama ?? "Ketua Kelas";
  const roster = useSyncExternalStore(subscribeToDemoStudents, getDemoStudents, getDemoStudentsServerSnapshot);
  const [date] = useState(getLocalDateKey);
  const attendanceStore = useSyncExternalStore(subscribeToDemoAttendance, getDemoAttendance, getDemoAttendanceServerSnapshot);
  const savedAttendance = attendanceStore[`${date}::${OWN_CLASS_ID}`] ?? {};
  const students: Student[] = roster
    .filter((student) => student.kelasId === OWN_CLASS_ID && student.status === "active")
    .map((student) => {
      const saved = savedAttendance[student.nis];
      return {
        nis: student.nis,
        nama: student.nama,
        status: saved?.status ?? null,
        waktu: saved?.waktu ?? null,
        keterangan: saved?.keterangan ?? "",
      };
    });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "BELUM" | "">("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const q = query.trim().toLowerCase();
  const visible = students.filter(
    (s) =>
      (!q || s.nama.toLowerCase().includes(q) || s.nis.includes(q)) &&
      (!statusFilter || (statusFilter === "BELUM" ? s.status === null : s.status === statusFilter)),
  );
  const count = (...statuses: Status[]) => students.filter((s) => s.status && statuses.includes(s.status)).length;
  const target = students.find((s) => s.nis === dialog?.nis);
  const close = () => setDialog(null);

  function save(nis: string, status: Status, keterangan: string) {
    const previous = savedAttendance[nis];
    const records: Record<string, DemoAttendanceRecord> = { ...savedAttendance };
    records[nis] = { status, keterangan, waktu: PRESENT.includes(status) ? (previous?.waktu ?? getLocalTime()) : null };
    if (!saveDemoAttendance(OWN_CLASS_ID, date, records)) {
      setToast("Presensi belum berhasil disimpan. Coba lagi beberapa saat.");
      return;
    }
    addDemoActivity("Presensi siswa diperbarui", `Ketua Kelas mengubah presensi ${target?.nama ?? nis} di kelas ${kelas?.nama}.`);
    close();
    setToast("Presensi disimpan");
  }

  function remove(nis: string) {
    const records: Record<string, DemoAttendanceRecord> = { ...savedAttendance };
    delete records[nis];
    if (!saveDemoAttendance(OWN_CLASS_ID, date, records)) {
      setToast("Presensi belum berhasil dihapus. Coba lagi beberapa saat.");
      return;
    }
    addDemoActivity("Presensi siswa dihapus", `Ketua Kelas menghapus presensi ${target?.nama ?? nis} di kelas ${kelas?.nama}.`);
    close();
    setToast("Presensi dihapus");
  }

  const actionButtons = (
    <>
      <Link href="/laporan" className={btn.outline}>Buka laporan</Link>
      <button type="button" onClick={() => setDialog({ kind: "form" })} className={`${btn.accent} flex-1 lg:flex-none`}>
        <Plus size={16} aria-hidden /> Tambah presensi
      </button>
    </>
  );

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{kelas?.nama}</h1>
          <p className="text-sm text-muted">Ketua Kelas: {ketuaName}</p>
        </div>
        <div className="hidden gap-2 lg:flex">{actionButtons}</div>
      </div>

      <div className="stat-grid [--stat-min:6rem]">
        <StatCard label="Jumlah Siswa" value={students.length} />
        <StatCard label="Hadir" value={count(...PRESENT)} color="success" />
        <StatCard label="Terlambat" value={count("TERLAMBAT")} color="warning" />
        <StatCard label="Izin" value={count("IZIN")} color="info" />
        <StatCard label="Sakit" value={count("SAKIT")} color="warning" />
        <StatCard label="Alpa" value={count("ALPA")} color="danger" />
      </div>
      <p className="text-xs text-muted">Jumlah Hadir sudah termasuk siswa yang terlambat; angka terlambat ditampilkan terpisah sebagai rincian.</p>

      <div className="flex gap-2">
        <label className={`${field} flex flex-1 items-center gap-2`}>
          <Search size={16} className="text-muted" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama atau NIS siswa" aria-label="Cari siswa" className="w-full bg-transparent outline-none" />
        </label>
        <select aria-label="Filter status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as Status | "BELUM" | "")} className={field}>
          <option value="">Semua status</option>
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          <option value="BELUM">Belum presensi</option>
        </select>
      </div>

      <StudentTable
        students={visible}
        actions={(s) => (
          <div className="flex">
            <IconButton label={`Detail presensi ${s.nama}`} onClick={() => setDialog({ kind: "detail", nis: s.nis })}><Eye size={18} /></IconButton>
            <IconButton label={`Edit presensi ${s.nama}`} onClick={() => setDialog({ kind: "form", nis: s.nis })}><Pencil size={18} /></IconButton>
            <IconButton label={`Hapus presensi ${s.nama}`} danger disabled={!s.status} onClick={() => setDialog({ kind: "delete", nis: s.nis })}><Trash2 size={18} /></IconButton>
          </div>
        )}
      />

      <div className="fixed inset-x-0 bottom-0 z-10 flex gap-2 border-t border-line bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">{actionButtons}</div>

      <Dialog open={dialog?.kind === "form"} title={target ? "Edit presensi" : "Tambah presensi"} onClose={close}>
        <PresensiForm options={students} target={target} onSubmit={save} onCancel={close} />
      </Dialog>

      <Dialog open={dialog?.kind === "detail"} title="Detail presensi" onClose={close}>
        {target && (
          <>
            <dl className="mt-4 grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
              <dt className="text-muted">Nama</dt><dd className="font-semibold">{target.nama}</dd>
              <dt className="text-muted">NIS</dt><dd>{target.nis}</dd>
              <dt className="text-muted">Status</dt><dd><StatusBadge status={target.status} /></dd>
              <dt className="text-muted">Waktu</dt><dd>{target.waktu ? `${target.waktu} WIB` : "—"}</dd>
              <dt className="text-muted">Keterangan</dt><dd>{target.keterangan || "—"}</dd>
            </dl>
            <div className="mt-5 flex justify-end"><button type="button" onClick={close} className={btn.outline}>Tutup</button></div>
          </>
        )}
      </Dialog>

      <Dialog open={dialog?.kind === "delete"} title="Hapus presensi?" onClose={close}>
        {target && (
          <>
            <p className="mt-2 text-sm text-muted">Presensi {target.nama} akan dihapus dan statusnya kembali menjadi belum presensi.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={close} className={btn.outline}>Batal</button>
              <button type="button" onClick={() => remove(target.nis)} className={btn.danger}>Hapus presensi</button>
            </div>
          </>
        )}
      </Dialog>

      {toast && (
        <div role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white lg:bottom-8">
          {toast}
        </div>
      )}
    </div>
  );
}
