"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRole } from "@/components/app-shell";
import { Dialog } from "@/components/dialog";
import { Badge, btn, card, field } from "@/components/ui";
import { createApiAdminRepository } from "@/lib/data/api-admin";
import { createApiSchoolRepository } from "@/lib/data/api-school";
import { createApiScheduleRepository } from "@/lib/data/api-schedules";
import type { AttendanceSchedule, SchoolAccount, SchoolClass } from "@/lib/data/contracts";
import { apiErrorMessage } from "@/lib/data/api-client";
import { ROLE_LABEL, type Role } from "@/lib/types";

const ROLES: Role[] = ["ADMIN", "GURU_PIKET", "KETUA_KELAS"];

export default function PengaturanPage() {
  const { role } = useRole();
  const [accounts, setAccounts] = useState<SchoolAccount[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [schedules, setSchedules] = useState<AttendanceSchedule[]>([]);
  const [editing, setEditing] = useState<SchoolAccount | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const admin = createApiAdminRepository();
    const school = createApiSchoolRepository();
    const schedule = createApiScheduleRepository();
    if (!admin || !school || !schedule) { setError("Backend belum dikonfigurasi."); return; }
    try {
      const [accountPage, classPage, scheduleList] = await Promise.all([admin.listAccounts({ limit: 100 }), school.listClasses(), schedule.listSchedules()]);
      setAccounts(accountPage.items); setClasses(classPage.items); setSchedules(scheduleList); setError(null);
    } catch (err: unknown) { setError(apiErrorMessage(err)); }
  }, []);
  useEffect(() => { if (role === "ADMIN") void Promise.resolve().then(refresh); }, [refresh, role]);

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null); setMessage(null);
    const form = new FormData(event.currentTarget);
    const input = { nama: String(form.get("nama") ?? "").trim(), email: String(form.get("email") ?? "").trim(), role: String(form.get("role") ?? "") as Role, kelasId: String(form.get("kelasId") ?? "") || null, password: String(form.get("password") ?? "") };
    if (input.role === "KETUA_KELAS" && !input.kelasId) { setError("Ketua Kelas harus ditugaskan ke satu kelas."); setBusy(false); return; }
    if (input.role !== "KETUA_KELAS") input.kelasId = null;
    const admin = createApiAdminRepository();
    try {
      if (!admin) throw new Error("Backend belum dikonfigurasi.");
      if (editing === "new") await admin.createAccount(input);
      else if (editing) await admin.updateAccount(editing.id, { ...input, password: input.password || undefined });
      setEditing(null); setMessage("Akun berhasil disimpan."); await refresh();
    } catch (err: unknown) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function updateAccountStatus(account: SchoolAccount) {
    const admin = createApiAdminRepository();
    try { if (!admin) throw new Error("Backend belum dikonfigurasi."); await admin.setAccountActive(account.id, !account.active); await refresh(); }
    catch (err: unknown) { setError(apiErrorMessage(err)); }
  }

  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setMessage(null); setBusy(true);
    const form = new FormData(event.currentTarget); const repo = createApiScheduleRepository();
    try {
      if (!repo) throw new Error("Backend belum dikonfigurasi.");
      await Promise.all(schedules.map((schedule) => repo.updateSchedule(schedule.id, { mulai: String(form.get(`${schedule.session}-mulai`)), selesai: String(form.get(`${schedule.session}-selesai`)) })));
      setMessage("Jadwal berhasil disimpan."); await refresh();
    } catch (err: unknown) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function toggleSchedule(schedule: AttendanceSchedule) {
    const repo = createApiScheduleRepository();
    try { if (!repo) throw new Error("Backend belum dikonfigurasi."); await repo.toggleScheduleLock(schedule.id); await refresh(); }
    catch (err: unknown) { setError(apiErrorMessage(err)); }
  }

  if (role !== "ADMIN") return <section className={`${card} max-w-lg space-y-4 p-6`}><h1 className="text-lg font-semibold">Profil</h1><p className="text-sm text-muted">Role: {ROLE_LABEL[role]}. Pengelolaan akun dilakukan oleh Admin sekolah.</p></section>;

  return <div className="space-y-6">
    <section className={`${card} space-y-4 p-5`}><div><h1 className="text-lg font-semibold">Jadwal presensi</h1><p className="mt-1 text-sm text-muted">Jadwal ini dipakai backend saat memvalidasi presensi.</p></div>
      <form onSubmit={saveSchedule} className="space-y-4">{schedules.map((schedule) => <fieldset key={schedule.id} className={`${card} grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end`}><legend className="px-1 text-sm font-semibold">Sesi {schedule.session.toLowerCase()}</legend><label className="grid gap-2 text-sm">Mulai<input type="time" name={`${schedule.session}-mulai`} defaultValue={schedule.mulai} required className={field} /></label><label className="grid gap-2 text-sm">Selesai<input type="time" name={`${schedule.session}-selesai`} defaultValue={schedule.selesai} required className={field} /></label><button type="button" onClick={() => void toggleSchedule(schedule)} className={btn.outline}>{schedule.terkunci ? "Buka kunci" : "Kunci sesi"}</button></fieldset>)}<button type="submit" className={btn.primary} disabled={busy}>Simpan jadwal</button></form>
    </section>
    <section className="space-y-4"><div className="flex items-end justify-between"><div><h2 className="text-lg font-semibold">Akun pengguna</h2><p className="text-sm text-muted">Kata sandi baru minimal 12 karakter.</p></div><button type="button" className={btn.primary} onClick={() => setEditing("new")}>Tambah akun</button></div>
      {error && <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}{message && <p role="status" className="rounded-md bg-success-soft px-4 py-3 text-sm text-success">{message}</p>}
      <div className={`${card} overflow-x-auto`}><table className="w-full min-w-160 text-sm"><thead><tr className="bg-primary-soft text-left text-xs font-semibold text-muted">{["Nama", "Email", "Role", "Kelas", "Status", "Aksi"].map((x) => <th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-line">{accounts.map((account) => <tr key={account.id}><td className="px-4 py-3 font-semibold">{account.nama}</td><td className="px-4 py-3">{account.email}</td><td className="px-4 py-3">{ROLE_LABEL[account.role]}</td><td className="px-4 py-3">{classes.find((item) => item.id === account.kelasId)?.nama ?? "—"}</td><td className="px-4 py-3"><Badge tone={account.active ? "success" : "neutral"}>{account.active ? "Aktif" : "Nonaktif"}</Badge></td><td className="px-4 py-3"><div className="flex gap-2"><button type="button" className={btn.outline} onClick={() => setEditing(account)}>Edit</button><button type="button" className={btn.outline} onClick={() => void updateAccountStatus(account)}>{account.active ? "Nonaktifkan" : "Aktifkan"}</button></div></td></tr>)}</tbody></table></div>
    </section>
    <Dialog open={Boolean(editing)} title={editing === "new" ? "Tambah akun" : "Edit akun"} onClose={() => setEditing(null)}><form onSubmit={saveAccount} className="mt-4 space-y-3"><label className="grid gap-1 text-sm">Nama<input name="nama" required maxLength={120} defaultValue={typeof editing === "object" && editing ? editing.nama : ""} className={field} /></label><label className="grid gap-1 text-sm">Email<input name="email" type="email" required defaultValue={typeof editing === "object" && editing ? editing.email : ""} className={field} /></label><label className="grid gap-1 text-sm">Role<select name="role" defaultValue={typeof editing === "object" && editing ? editing.role : "GURU_PIKET"} className={field}>{ROLES.map((item) => <option key={item} value={item}>{ROLE_LABEL[item]}</option>)}</select></label><label className="grid gap-1 text-sm">Kelas<select name="kelasId" defaultValue={typeof editing === "object" && editing ? editing.kelasId ?? "" : ""} className={field}><option value="">Tidak ada</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}</select></label><label className="grid gap-1 text-sm">{editing === "new" ? "Kata sandi awal" : "Kata sandi baru (kosongkan jika tidak diubah)"}<input name="password" type="password" minLength={editing === "new" ? 12 : undefined} required={editing === "new"} autoComplete="new-password" className={field} /></label><div className="flex justify-end gap-2"><button type="button" className={btn.outline} onClick={() => setEditing(null)}>Batal</button><button type="submit" className={btn.primary} disabled={busy}>Simpan</button></div></form></Dialog>
  </div>;
}
