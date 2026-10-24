"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Search, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { createApiAdminRepository } from "@/lib/data/api-admin";
import { apiErrorMessage } from "@/lib/data/api-client";
import type { SchoolTeacher } from "@/lib/data/contracts";
import { Badge, btn, card, EmptyState, field } from "./ui";
import { Dialog } from "./dialog";

const CELL = "px-4 py-3";
export function AdminTeachers() {
  const [teachers, setTeachers] = useState<SchoolTeacher[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<SchoolTeacher | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const repo = createApiAdminRepository();
    if (!repo) { setError("Backend belum dikonfigurasi."); return; }
    try { setTeachers((await repo.listTeachers()).items); setError(null); }
    catch (err: unknown) { setError(apiErrorMessage(err)); }
  }, []);
  useEffect(() => { void Promise.resolve().then(refresh); }, [refresh]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setMessage(null);
    const data = new FormData(event.currentTarget); const input = { nip: String(data.get("nip") ?? "").trim(), nama: String(data.get("nama") ?? "").trim() };
    const repo = createApiAdminRepository();
    try {
      if (!repo) throw new Error("Backend belum dikonfigurasi.");
      if (editing === "new") await repo.createTeacher(input); else if (editing) await repo.updateTeacher(editing.id, input);
      setEditing(null); setMessage("Data guru tersimpan."); await refresh();
    } catch (err: unknown) { setError(apiErrorMessage(err)); }
  }

  async function toggle(teacher: SchoolTeacher) {
    const repo = createApiAdminRepository();
    try { if (!repo) throw new Error("Backend belum dikonfigurasi."); await repo.setTeacherActive(teacher.id, teacher.status !== "active"); await refresh(); }
    catch (err: unknown) { setError(apiErrorMessage(err)); }
  }

  async function remove(teacher: SchoolTeacher) {
    if (!window.confirm(`Hapus data ${teacher.nama}?`)) return;
    const repo = createApiAdminRepository();
    try { if (!repo) throw new Error("Backend belum dikonfigurasi."); await repo.deleteTeacher(teacher.id); await refresh(); }
    catch (err: unknown) { setError(apiErrorMessage(err)); }
  }

  const filtered = teachers.filter((teacher) => `${teacher.nip} ${teacher.nama}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold">Data Guru</h1><p className="mt-1 text-sm text-muted">Kelola data guru sekolah.</p></div><button type="button" onClick={() => setEditing("new")} className={btn.primary}><Plus size={16} aria-hidden /> Tambah guru</button></div>
    {error && <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}{message && <p role="status" className="rounded-md bg-success-soft px-4 py-3 text-sm text-success">{message}</p>}
    <label className={`${field} flex max-w-xl items-center gap-2`}><Search size={16} className="text-muted" aria-hidden /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama atau NIP guru" aria-label="Cari nama atau NIP guru" className="w-full bg-transparent outline-none" /></label>
    <section aria-label="Daftar guru" className={`${card} overflow-hidden`}>{filtered.length === 0 ? <EmptyState title={query ? "Guru tidak ditemukan" : "Belum ada data guru"} description={query ? "Coba kata kunci yang berbeda." : "Tambahkan data guru dari backend."} /> : <div className="overflow-x-auto"><table className="w-full min-w-128 text-sm"><thead><tr className="bg-primary-soft text-left text-xs font-semibold text-muted">{["NIP", "Nama guru", "Status", "Aksi"].map((x) => <th key={x} scope="col" className={CELL}>{x}</th>)}</tr></thead><tbody className="divide-y divide-line">{filtered.map((teacher) => <tr key={teacher.id} className="hover:bg-canvas"><td className={`${CELL} tabular-nums`}>{teacher.nip}</td><td className={`${CELL} font-semibold`}>{teacher.nama}</td><td className={CELL}><Badge tone={teacher.status === "active" ? "success" : "neutral"}>{teacher.status === "active" ? "Aktif" : "Nonaktif"}</Badge></td><td className={CELL}><div className="flex gap-1"><button type="button" aria-label={`Edit ${teacher.nama}`} onClick={() => setEditing(teacher)} className="grid size-9 place-items-center rounded-md text-muted hover:bg-primary-soft"><Pencil size={16} /></button><button type="button" aria-label={`${teacher.status === "active" ? "Nonaktifkan" : "Aktifkan"} ${teacher.nama}`} onClick={() => void toggle(teacher)} className="grid size-9 place-items-center rounded-md text-muted hover:bg-primary-soft">{teacher.status === "active" ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}</button><button type="button" aria-label={`Hapus ${teacher.nama}`} onClick={() => void remove(teacher)} className="grid size-9 place-items-center rounded-md text-danger hover:bg-danger-soft"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>}</section>
    <Dialog open={Boolean(editing)} title={editing === "new" ? "Tambah data guru" : "Edit data guru"} onClose={() => setEditing(null)}><form onSubmit={save} className="mt-4 space-y-4"><label className="grid gap-2 text-sm font-medium">NIP<input name="nip" required maxLength={30} defaultValue={editing && typeof editing === "object" ? editing.nip : ""} className={field} autoComplete="off" /></label><label className="grid gap-2 text-sm font-medium">Nama guru<input name="nama" required maxLength={120} defaultValue={editing && typeof editing === "object" ? editing.nama : ""} className={field} /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className={btn.outline}>Batal</button><button type="submit" className={btn.primary}>Simpan</button></div></form></Dialog>
  </div>;
}
