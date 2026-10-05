"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { Clock3, KeyRound, LockKeyhole, LockOpen } from "lucide-react";
import { useRole } from "@/components/app-shell";
import { ManageTable, type Column, type FieldDef } from "@/components/manage-table";
import { Badge, btn, card, field } from "@/components/ui";
import { Dialog } from "@/components/dialog";
import { addDemoActivity } from "@/lib/activity-log";
import { getAccountRows, getClasses } from "@/lib/mock";
import { ROLE_LABEL, type AccountRow, type Role } from "@/lib/types";
import {
  getDemoAttendanceSchedule,
  getDemoAttendanceScheduleServerSnapshot,
  isValidAttendanceSchedule,
  saveDemoAttendanceSchedule,
  subscribeToDemoAttendanceSchedule,
  type AttendanceSessionId,
  type AttendanceSessionSchedule,
  type DemoAttendanceSchedule,
} from "@/lib/demo-schedule";

const classes = getClasses();
const roles = Object.keys(ROLE_LABEL) as Role[];

const columns: Column<AccountRow>[] = [
  { header: "Nama", cell: (r) => <span className="font-semibold">{r.nama}</span> },
  { header: "Email", cell: (r) => r.email },
  { header: "Role", cell: (r) => <Badge tone={r.role === "ADMIN" ? "info" : r.role === "GURU_PIKET" ? "accent" : "neutral"}>{ROLE_LABEL[r.role]}</Badge> },
  { header: "Kelas", cell: (r) => r.role === "KETUA_KELAS" ? classes.find((c) => c.id === r.kelasId)?.nama ?? "—" : "—" },
];
const fields: FieldDef<AccountRow>[] = [
  { name: "nama", label: "Nama", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "role", label: "Role", type: "select", required: true, options: roles.map((r) => ({ value: r, label: ROLE_LABEL[r] })) },
  { name: "kelasId", label: "Kelas (khusus Ketua Kelas)", type: "select", options: classes.map((c) => ({ value: c.id, label: c.nama })) },
];

function validate(values: Record<string, string>, rows: AccountRow[], editingId?: string) {
  if (rows.some((r) => r.email.toLowerCase() === values.email.toLowerCase() && r.id !== editingId)) return "Email sudah dipakai akun lain.";
  if (values.role !== "KETUA_KELAS") return null;
  if (!values.kelasId) return "Ketua Kelas harus ditugaskan ke satu kelas.";
  if (rows.some((r) => r.role === "KETUA_KELAS" && r.kelasId === values.kelasId && r.id !== editingId)) {
    return "Kelas ini sudah memiliki akun Ketua Kelas. Pilih kelas lain.";
  }
  return null;
}

export default function PengaturanPage() {
  const { role } = useRole();
  const [reset, setReset] = useState<{ account: AccountRow; temporaryPassword: string } | null>(null);
  const schedule = useSyncExternalStore(
    subscribeToDemoAttendanceSchedule,
    getDemoAttendanceSchedule,
    getDemoAttendanceScheduleServerSnapshot,
  );

  if (role !== "ADMIN") {
    return (
      <section className={`${card} max-w-lg space-y-4 p-6`}>
        <h1 className="text-lg font-semibold">Profil</h1>
        <dl className="grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
          <dt className="text-muted">Role</dt><dd className="font-semibold">{ROLE_LABEL[role]}</dd>
          <dt className="text-muted">Sekolah</dt><dd>SMK Negeri 11 Jakarta</dd>
        </dl>
        <p className="text-sm text-muted">Pengelolaan akun dilakukan oleh Admin sekolah.</p>
      </section>
    );
  }
  return (
    <div className="space-y-6">
      <AttendanceScheduleForm key={JSON.stringify(schedule)} schedule={schedule} />

      <div>
        <h2 className="text-lg font-semibold">Akun pengguna</h2>
        <p className="text-sm text-muted">Kelola akun Admin, Guru Piket, dan Ketua Kelas.</p>
      </div>
      <ManageTable<AccountRow>
        noun="akun"
        initialRows={getAccountRows()}
        columns={columns}
        fields={fields}
        searchText={(r) => `${r.nama} ${r.email}`}
        validate={validate}
        rowActions={(account) => (
          <button
            type="button"
            aria-label={`Reset sandi demo ${account.nama}`}
            title="Reset sandi demo"
            onClick={() => {
              const bytes = crypto.getRandomValues(new Uint8Array(8));
              const temporaryPassword = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
              setReset({ account, temporaryPassword });
              addDemoActivity("Sandi demo dibuat ulang", `Admin membuat sandi sementara untuk akun ${account.nama}.`);
            }}
            className="grid size-10 place-items-center rounded-md text-muted hover:bg-primary-soft hover:text-ink"
          >
            <KeyRound size={18} aria-hidden />
          </button>
        )}
      />
      <Dialog open={Boolean(reset)} title="Sandi sementara demo" onClose={() => setReset(null)}>
        {reset && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted">Sandi contoh untuk akun <strong className="text-ink">{reset.account.nama}</strong>. Fitur ini belum mengubah akun sungguhan.</p>
            <output className="block select-all rounded-md border border-line bg-canvas px-4 py-3 font-mono text-lg font-semibold tracking-widest">{reset.temporaryPassword}</output>
            <div className="flex justify-end">
              <button type="button" onClick={() => setReset(null)} className={btn.primary}>Selesai</button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function AttendanceScheduleForm({ schedule }: { schedule: DemoAttendanceSchedule }) {
  const [draft, setDraft] = useState(schedule);
  const [message, setMessage] = useState<string | null>(null);

  function updateTime(session: AttendanceSessionId, field: "mulai" | "selesai", value: string) {
    setDraft((current) => ({
      ...current,
      [session]: { ...current[session], [field]: value },
    }));
    setMessage(null);
  }

  function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidAttendanceSchedule(draft)) {
      setMessage("Pastikan jam selesai setelah jam mulai dan sesi pagi tidak bertabrakan dengan sesi siang.");
      return;
    }
    if (!saveDemoAttendanceSchedule(draft)) {
      setMessage("Jadwal belum berhasil disimpan. Periksa penyimpanan browser lalu coba lagi.");
      return;
    }
    addDemoActivity("Jadwal presensi diperbarui", "Admin memperbarui jam presensi sesi pagi dan siang.");
    setMessage("Jadwal presensi berhasil disimpan.");
  }

  function toggleSessionLock(session: AttendanceSessionId) {
    const current = getDemoAttendanceSchedule();
    const next = {
      ...current,
      [session]: { ...current[session], terkunci: !current[session].terkunci },
    };
    if (!saveDemoAttendanceSchedule(next)) {
      setMessage("Status kunci sesi belum berhasil diubah. Periksa penyimpanan browser lalu coba lagi.");
      return;
    }
    const status = next[session].terkunci ? "dikunci" : "dibuka";
    addDemoActivity("Kunci sesi presensi diubah", `Admin ${status} sesi ${session}.`);
    setMessage(`Sesi ${session} berhasil ${status}.`);
  }

  return (
    <section className={`${card} space-y-4 p-5`}>
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold"><Clock3 size={20} aria-hidden /> Jadwal presensi</h1>
        <p className="mt-1 text-sm text-muted">Atur jendela presensi untuk Ketua Kelas. Di luar jam atau saat sesi dikunci, status Hadir/Terlambat memerlukan izin Guru Piket per siswa.</p>
      </div>
      <form onSubmit={saveSchedule} className="space-y-4">
        {(["pagi", "siang"] as const).map((session) => (
          <SessionScheduleFields
            key={session}
            id={session}
            schedule={draft[session]}
            onTimeChange={(field, value) => updateTime(session, field, value)}
            onToggleLock={() => toggleSessionLock(session)}
          />
        ))}
        {message && <p role="status" className="rounded-md bg-primary-soft px-3 py-2 text-sm text-primary">{message}</p>}
        <button type="submit" className={btn.primary}>Simpan jadwal</button>
      </form>
    </section>
  );
}

function SessionScheduleFields({
  id,
  schedule,
  onTimeChange,
  onToggleLock,
}: {
  id: AttendanceSessionId;
  schedule: AttendanceSessionSchedule;
  onTimeChange: (field: "mulai" | "selesai", value: string) => void;
  onToggleLock: () => void;
}) {
  const title = id === "pagi" ? "Sesi pagi" : "Sesi siang";
  const LockIcon = schedule.terkunci ? LockKeyhole : LockOpen;
  return (
    <fieldset className={`${card} grid gap-4 p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end`}>
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      <label className="grid gap-2 text-sm font-medium">
        Jam masuk
        <input type="time" value={schedule.mulai} onChange={(event) => onTimeChange("mulai", event.target.value)} required className={field} />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Jam keluar
        <input type="time" value={schedule.selesai} onChange={(event) => onTimeChange("selesai", event.target.value)} required className={field} />
      </label>
      <p className="text-sm text-muted">{schedule.terkunci ? "Sesi dikunci" : "Sesi tidak dikunci"}</p>
      <button type="button" onClick={onToggleLock} className={btn.outline}>
        <LockIcon size={16} aria-hidden />
        {schedule.terkunci ? "Buka kunci" : "Kunci sesi"}
      </button>
    </fieldset>
  );
}
