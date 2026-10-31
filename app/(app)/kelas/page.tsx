"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createApiAdminRepository } from "@/lib/data/api-admin";
import { createApiSchoolRepository } from "@/lib/data/api-school";
import type { SchoolAccount, SchoolClass } from "@/lib/data/contracts";
import { apiErrorMessage } from "@/lib/data/api-client";
import { RoleGate } from "@/components/role-gate";
import { Dialog } from "@/components/dialog";
import { Badge, btn, card, EmptyState, field } from "@/components/ui";

export default function KelasPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [leaders, setLeaders] = useState<SchoolAccount[]>([]);
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const school = createApiSchoolRepository();
    const admin = createApiAdminRepository();
    if (!school || !admin) { setError("Backend belum dikonfigurasi."); return; }
    try {
      const [classPage, accountPage] = await Promise.all([
        school.listClasses(), admin.listAccounts({ limit: 100 }),
      ]);
      setClasses(classPage.items);
      setLeaders(accountPage.items.filter((account) => account.role === "KETUA_KELAS" && account.active));
      setError(null);
    } catch (err: unknown) { setError(apiErrorMessage(err)); }
  }, []);

  useEffect(() => { void Promise.resolve().then(refresh); }, [refresh]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(null); setError(null);
    const form = new FormData(event.currentTarget);
    const input = { nama: String(form.get("nama") ?? "").trim(), jurusan: String(form.get("jurusan") ?? "").trim() };
    const repo = createApiSchoolRepository();
    try {
      if (!repo) throw new Error("Backend belum dikonfigurasi.");
      if (editing) await repo.updateClass(editing.id, input); else await repo.createClass(input);
      setEditing(null); setMessage("Data kelas tersimpan."); await refresh();
    } catch (err: unknown) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function assignLeader(kelasId: string, accountId: string) {
    const repo = createApiSchoolRepository();
    try {
      if (!repo) throw new Error("Backend belum dikonfigurasi.");
      await repo.assignClassLeader(kelasId, accountId || null); await refresh();
    } catch (err: unknown) { setError(apiErrorMessage(err)); }
  }

  async function remove(item: SchoolClass) {
    if (!window.confirm(`Hapus kelas ${item.nama}?`)) return;
    const repo = createApiSchoolRepository();
    try {
      if (!repo) throw new Error("Backend belum dikonfigurasi.");
      await repo.deleteClass(item.id); setMessage(`Kelas ${item.nama} dihapus.`); await refresh();
    } catch (err: unknown) { setError(apiErrorMessage(err)); }
  }

  return <RoleGate allow={["ADMIN"]}><div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold">Data Kelas</h1><p className="mt-1 text-sm text-muted">Kelola kelas dan akun Ketua Kelas.</p></div><button type="button" className={btn.primary} onClick={() => setEditing({ id: "", nama: "", jurusan: "", ketuaAkunId: null, active: true })}>Tambah kelas</button></div>
    {error && <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
    {message && <p role="status" className="rounded-md bg-success-soft px-4 py-3 text-sm text-success">{message}</p>}
    <section className={`${card} overflow-x-auto`}><table className="w-full min-w-180 text-sm"><thead><tr className="bg-primary-soft text-left text-xs font-semibold text-muted">{["Kelas", "Jurusan", "Siswa aktif", "Ketua Kelas", "Status", "Aksi"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-line">
      {classes.map((item) => <tr key={item.id}><td className="px-4 py-3 font-semibold">{item.nama}</td><td className="px-4 py-3">{item.jurusan}</td><td className="px-4 py-3">{item.totalSiswa ?? "—"}</td><td className="px-4 py-3"><select aria-label={`Ketua kelas ${item.nama}`} value={item.ketuaAkunId ?? ""} onChange={(event) => void assignLeader(item.id, event.target.value)} className={field}><option value="">Belum ditentukan</option>{leaders.map((leader) => <option key={leader.id} value={leader.id}>{leader.nama}</option>)}</select></td><td className="px-4 py-3"><Badge tone={item.active ? "success" : "neutral"}>{item.active ? "Aktif" : "Nonaktif"}</Badge></td><td className="px-4 py-3"><div className="flex gap-2"><button type="button" className={btn.outline} onClick={() => setEditing(item)}>Edit</button><button type="button" className={btn.danger} onClick={() => void remove(item)}>Hapus</button></div></td></tr>)}
      {classes.length === 0 && <tr><td colSpan={6}><EmptyState title="Belum ada kelas" description="Tambahkan kelas untuk mulai mengatur data siswa." /></td></tr>}
    </tbody></table></section>
    <Dialog open={Boolean(editing)} title={editing?.id ? "Edit kelas" : "Tambah kelas"} onClose={() => setEditing(null)}><form onSubmit={save} className="mt-4 space-y-4"><label className="grid gap-2 text-sm font-medium">Nama kelas<input name="nama" required maxLength={80} defaultValue={editing?.nama} className={field} /></label><label className="grid gap-2 text-sm font-medium">Jurusan<input name="jurusan" required maxLength={80} defaultValue={editing?.jurusan} className={field} /></label><div className="flex justify-end gap-2"><button type="button" className={btn.outline} onClick={() => setEditing(null)}>Batal</button><button type="submit" className={btn.primary} disabled={busy}>{busy ? "Menyimpan…" : "Simpan"}</button></div></form></Dialog>
  </div></RoleGate>;
}
