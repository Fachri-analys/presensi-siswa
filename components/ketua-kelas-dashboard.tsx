"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  FilePlus,
  FileText,
  HeartPulse,
  Info,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Users,
  UserX,
  X,
} from "lucide-react";
import { getLocalDateKey, getLocalTime } from "@/lib/time";
import { useRole } from "./app-shell";
import { STATUS_LABEL, type Status, type Student } from "@/lib/types";
import { Dialog } from "./dialog";
import { StudentTable } from "./student-table";
import { btn, card, field, StatCard, StatusBadge } from "./ui";
import { useAttendanceWindow } from "./use-attendance-window";
import { createApiAttendanceRepository } from "@/lib/data/api-attendance";
import { apiErrorMessage } from "@/lib/data/api-client";
import { createApiSchoolRepository } from "@/lib/data/api-school";
import type { AttendanceRecord, SchoolClass, SchoolStudent } from "@/lib/data/contracts";
import { SuratSakitModal } from "./surat-sakit-modal";

// Ketua Kelas hanya melihat kelas yang ditetapkan pada sesi server.
const PRESENT: Status[] = ["HADIR", "TERLAMBAT"];

type DialogState = { kind: "form" | "detail" | "delete"; nis?: string } | null;

const isStatus = (value: string): value is Status => Object.hasOwn(STATUS_LABEL, value);

function IconButton({
  label,
  onClick,
  danger,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-10 pointer-coarse:size-12 place-items-center rounded-md hover:bg-primary-soft disabled:opacity-30 transition-colors ${
        danger ? "text-danger hover:bg-danger-soft" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

interface FormProps {
  options: Student[];
  target?: Student;
  presentAllowedFor: (nis: string) => boolean;
  onSubmit: (nis: string, status: Status, keterangan: string) => Promise<void> | void;
  onCancel: () => void;
}

function PresensiForm({ options, target, presentAllowedFor, onSubmit, onCancel }: FormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedNis, setSelectedNis] = useState(target?.nis ?? "");
  const presentAllowed = presentAllowedFor(selectedNis);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const data = new FormData(e.currentTarget);
    const nis = String(data.get("nis") ?? "");
    const value = String(data.get("status") ?? "");
    if (!options.some((student) => student.nis === nis) || !isStatus(value)) {
      setFormError("Pilih siswa dan status presensi yang tersedia.");
      return;
    }
    if (PRESENT.includes(value) && !presentAllowed) {
      setFormError("Status Hadir/Terlambat di luar jadwal memerlukan izin Guru Piket.");
      return;
    }
    await onSubmit(nis, value, String(data.get("keterangan") ?? "").trim());
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
      <label className="grid gap-2 text-sm font-medium">
        Siswa
        <select
          name="nis"
          defaultValue={target?.nis ?? ""}
          onChange={(event) => setSelectedNis(event.target.value)}
          className={field}
        >
          {!target && <option value="" disabled>Pilih siswa</option>}
          {(target ? [target] : options).map((s) => (
            <option key={s.nis} value={s.nis}>
              {s.nama} ({s.nis})
            </option>
          ))}
        </select>
      </label>
      {formError && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
      <label className="grid gap-2 text-sm font-medium">
        Status
        <select name="status" defaultValue={target?.status ?? ""} className={field}>
          <option value="" disabled>Pilih status</option>
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
            <option key={s} value={s} disabled={PRESENT.includes(s) && !presentAllowed}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
      {!presentAllowed && (
        <div className="flex items-start gap-2 rounded-md bg-warning-soft p-3 text-xs text-warning">
          <Info size={14} className="shrink-0 mt-0.5" aria-hidden />
          <span>Di luar jadwal atau sesi sedang dikunci: hanya status Izin, Sakit, dan Alpa yang dapat dipilih langsung tanpa izin Guru Piket.</span>
        </div>
      )}
      <label className="grid gap-2 text-sm font-medium">
        Keterangan
        <input name="keterangan" maxLength={120} defaultValue={target?.keterangan} placeholder="Opsional (misal: sakit demam, izin lomba)" className={field} />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className={btn.outline}>Batal</button>
        <button type="submit" className={btn.primary}>Simpan presensi</button>
      </div>
    </form>
  );
}

export function KetuaKelasDashboard() {
  const { user, kelasId: sessionClassId } = useRole();
  const kelasId = sessionClassId ?? "";
  const [kelas, setKelas] = useState<SchoolClass | null>(null);
  const [roster, setRoster] = useState<SchoolStudent[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const ketuaName = user?.nama ?? "Ketua Kelas";
  const [date] = useState(getLocalDateKey);
  const { activeSession, ready } = useAttendanceWindow();

  const refresh = useCallback(async () => {
    const school = createApiSchoolRepository();
    const attendance = createApiAttendanceRepository();
    if (!school || !attendance || !kelasId) {
      setLoadingError("Backend belum dikonfigurasi atau akun belum memiliki kelas.");
      return;
    }
    try {
      const [classItem, studentsPage, saved] = await Promise.all([
        school.getClass(kelasId),
        school.listStudents({ kelasId, status: "active", limit: 100 }),
        attendance.listClassAttendance(kelasId, date),
      ]);
      setKelas(classItem);
      setRoster(studentsPage.items);
      setRecords(saved);
      setLoadingError(null);
    } catch (err: unknown) {
      setLoadingError(apiErrorMessage(err));
    }
  }, [kelasId, date]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const savedAttendance = Object.fromEntries(records.map((record) => [record.nis, record]));
  const students: Student[] = roster.map((student) => {
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
  const [suratSakitOpen, setSuratSakitOpen] = useState(false);
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

  async function save(nis: string, status: Status, keterangan: string) {
    const previous = savedAttendance[nis];
    const waktu = PRESENT.includes(status) ? (previous?.waktu ?? getLocalTime()) : null;
    const attendanceRepo = createApiAttendanceRepository();
    if (!attendanceRepo) {
      setToast("Backend belum dikonfigurasi.");
      return;
    }
    try {
      if (previous?.id) {
        await attendanceRepo.updateAttendance(previous.id, { status, waktu, keterangan });
      } else {
        await attendanceRepo.saveClassAttendance({ date, kelasId, records: [{ nis, status, waktu, keterangan }] });
      }
    } catch (err: unknown) {
      setToast(`Gagal menyimpan presensi ke server: ${apiErrorMessage(err)}`);
      return;
    }

    await refresh();
    close();
    setToast("Presensi berhasil disimpan.");
  }

  async function remove(nis: string) {
    const attendanceRepo = createApiAttendanceRepository();
    const attendanceRecord = savedAttendance[nis];
    if (!attendanceRepo || !attendanceRecord) {
      setToast("Presensi tidak ditemukan di backend.");
      return;
    }
    try {
      await attendanceRepo.deleteAttendance(attendanceRecord.id);
    } catch (err: unknown) {
      setToast(`Gagal menghapus presensi: ${apiErrorMessage(err)}`);
      return;
    }

    await refresh();
    close();
    setToast("Presensi berhasil dihapus.");
  }

  const actionButtons = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setSuratSakitOpen(true)}
        className={`${btn.outline} px-3 sm:px-4 text-xs sm:text-sm`}
      >
        <FilePlus size={16} aria-hidden />
        <span>Surat Sakit</span>
      </button>
      <Link
        href="/laporan"
        className={`${btn.outline} px-3 sm:px-4 text-xs sm:text-sm`}
      >
        <FileText size={16} aria-hidden />
        <span>Laporan</span>
      </Link>
      <button
        type="button"
        onClick={() => setDialog({ kind: "form" })}
        className={`${btn.accent} flex-1 sm:flex-none px-3 sm:px-4 text-xs sm:text-sm`}
      >
        <Plus size={16} aria-hidden />
        <span>Catat Presensi</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {loadingError && (
        <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
          Gagal memuat kelas: {loadingError}
        </p>
      )}

      {/* Header Section */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-ink">
              Ketua Kelas
            </span>
            <span className="text-xs text-muted">Penanggung Jawab: {ketuaName}</span>
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
            Presensi Kelas {kelas?.nama ?? "…"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {kelas?.jurusan ? `${kelas.jurusan} · ` : ""}Catat dan kelola presensi harian serta dokumen surat sakit kelas Anda.
          </p>
        </div>
        <div className="hidden sm:flex sm:items-center">{actionButtons}</div>
      </div>

      {/* Schedule / Window Status Banner */}
      <div
        role="note"
        className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${
          activeSession
            ? "border-success/30 bg-success-soft text-success"
            : "border-warning/30 bg-warning-soft text-warning"
        }`}
      >
        {!ready ? (
          <>
            <Clock size={18} className="shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="font-semibold">Memeriksa jadwal presensi…</p>
              <p className="text-xs opacity-85">Menghubungkan ke konfigurasi jam presensi sekolah.</p>
            </div>
          </>
        ) : activeSession ? (
          <>
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="font-semibold">Sesi {activeSession} Sedang Terbuka</p>
              <p className="text-xs opacity-90">
                Jadwal presensi aktif. Status <strong>Hadir</strong> dan <strong>Terlambat</strong> dapat dicatat langsung untuk siswa.
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertCircle size={18} className="shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="font-semibold">Di Luar Jadwal Presensi / Sesi Terkunci</p>
              <p className="text-xs opacity-90">
                Pencatatan status <strong>Hadir/Terlambat</strong> di luar jadwal memerlukan izin Guru Piket. Status <strong>Izin</strong>, <strong>Sakit</strong>, dan <strong>Alpa</strong> tetap dapat dicatat langsung.
              </p>
            </div>
          </>
        )}
      </div>

      {/* KPI Stat Cards with Icons */}
      <section aria-label="Statistik kehadiran kelas" className="space-y-3">
        <div className="stat-grid [--stat-min:8.5rem]">
          <StatCard label="Jumlah Siswa" value={students.length} icon={Users} />
          <StatCard label="Hadir" value={count(...PRESENT)} color="success" icon={UserCheck} />
          <StatCard label="Terlambat" value={count("TERLAMBAT")} color="warning" icon={Clock} />
          <StatCard label="Izin" value={count("IZIN")} color="info" icon={FileText} />
          <StatCard label="Sakit" value={count("SAKIT")} color="warning" icon={HeartPulse} />
          <StatCard label="Alpa" value={count("ALPA")} color="danger" icon={UserX} />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Info size={14} className="shrink-0 text-muted" aria-hidden />
          <span>Jumlah Hadir mencakup siswa tepat waktu dan terlambat; angka Terlambat dicantumkan sebagai rincian.</span>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section aria-label="Filter dan pencarian siswa" className={`${card} p-3.5 sm:p-4`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className={`${field} flex flex-1 items-center gap-2 bg-canvas/70`}>
            <Search size={16} className="text-muted shrink-0" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama atau NIS siswa…"
              aria-label="Cari siswa"
              className="w-full bg-transparent outline-none"
            />
          </label>
          <div className="flex items-center gap-2">
            <select
              aria-label="Filter status presensi"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Status | "BELUM" | "")}
              className={`${field} bg-canvas/70 min-w-40`}
            >
              <option value="">Semua status</option>
              {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
              <option value="BELUM">Belum presensi</option>
            </select>
            {(query || statusFilter) && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("");
                }}
                className="inline-flex h-10 items-center gap-1 rounded-md px-3 text-xs font-semibold text-danger hover:bg-danger-soft transition-colors pointer-coarse:h-12"
              >
                <X size={14} aria-hidden />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Students Attendance Table */}
      <section aria-label="Daftar kehadiran siswa kelas">
        <StudentTable
          students={visible}
          actions={(s) => (
            <div className="flex items-center gap-0.5">
              <IconButton label={`Detail presensi ${s.nama}`} onClick={() => setDialog({ kind: "detail", nis: s.nis })}>
                <Eye size={17} />
              </IconButton>
              <IconButton label={`Edit presensi ${s.nama}`} onClick={() => setDialog({ kind: "form", nis: s.nis })}>
                <Pencil size={17} />
              </IconButton>
              <IconButton
                label={`Hapus presensi ${s.nama}`}
                danger
                disabled={!s.status}
                onClick={() => setDialog({ kind: "delete", nis: s.nis })}
              >
                <Trash2 size={17} />
              </IconButton>
            </div>
          )}
        />
      </section>

      {/* Floating Action Bar for Mobile */}
      <div className="fixed inset-x-0 bottom-0 z-10 flex gap-2 border-t border-line bg-surface/95 backdrop-blur-md p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:hidden">
        {actionButtons}
      </div>

      {/* Modals & Dialogs */}
      <Dialog open={dialog?.kind === "form"} title={target ? "Edit presensi siswa" : "Tambah presensi siswa"} onClose={close}>
        <PresensiForm
          options={students}
          target={target}
          presentAllowedFor={() => ready && activeSession !== null}
          onSubmit={save}
          onCancel={close}
        />
      </Dialog>

      <Dialog open={dialog?.kind === "detail"} title="Detail presensi siswa" onClose={close}>
        {target && (
          <div className="mt-4 space-y-4">
            <dl className="grid grid-cols-[7.5rem_1fr] gap-y-2.5 text-sm">
              <dt className="text-muted">Nama Siswa</dt>
              <dd className="font-semibold text-ink">{target.nama}</dd>
              <dt className="text-muted">NIS</dt>
              <dd className="tabular-nums font-mono text-ink">{target.nis}</dd>
              <dt className="text-muted">Status</dt>
              <dd><StatusBadge status={target.status} /></dd>
              <dt className="text-muted">Waktu Presensi</dt>
              <dd className="tabular-nums">{target.waktu ? `${target.waktu} WIB` : "—"}</dd>
              <dt className="text-muted">Keterangan</dt>
              <dd className="text-ink">{target.keterangan || "—"}</dd>
            </dl>
            <div className="flex justify-end pt-2 border-t border-line">
              <button type="button" onClick={close} className={btn.outline}>Tutup</button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={dialog?.kind === "delete"} title="Hapus catatan presensi?" onClose={close}>
        {target && (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-muted">
              Catatan presensi untuk <strong>{target.nama}</strong> (NIS {target.nis}) akan dihapus dan status siswa kembali menjadi <em>belum presensi</em>.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button type="button" onClick={close} className={btn.outline}>Batal</button>
              <button type="button" onClick={() => remove(target.nis)} className={btn.danger}>Hapus presensi</button>
            </div>
          </div>
        )}
      </Dialog>

      {toast && (
        <div role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg lg:bottom-8">
          {toast}
        </div>
      )}

      <SuratSakitModal
        open={suratSakitOpen}
        onClose={() => setSuratSakitOpen(false)}
        initialClassId={kelasId || undefined}
      />
    </div>
  );
}
