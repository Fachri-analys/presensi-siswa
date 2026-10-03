"use client";

import { useState, useSyncExternalStore } from "react";
import { Pencil, Plus, Search, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { addDemoActivity } from "@/lib/activity-log";
import { createId } from "@/lib/id";
import { getDemoTeachers, getDemoTeachersServerSnapshot, subscribeToDemoTeachers, updateDemoTeachers, type DemoTeacher } from "@/lib/demo-teachers";
import { Badge, btn, card, EmptyState, field, Pagination } from "./ui";
import { Dialog } from "./dialog";

const PAGE_SIZE = 10;
const CELL = "px-4 py-3";

export function AdminTeachers() {
  const teachers = useSyncExternalStore(subscribeToDemoTeachers, getDemoTeachers, getDemoTeachersServerSnapshot);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ kind: "form" | "delete" | "status"; teacher?: DemoTeacher } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = teachers.filter((teacher) => `${teacher.nip} ${teacher.nama}`.toLowerCase().includes(query.trim().toLowerCase()));
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function closeDialog() {
    setDialog(null);
    setFormError(null);
  }

  function saveTeacher(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const data = new FormData(event.currentTarget);
    const nip = String(data.get("nip") ?? "").trim();
    const nama = String(data.get("nama") ?? "").trim();
    const editing = dialog?.kind === "form" ? dialog.teacher : undefined;

    if (!nip || !nama) {
      setFormError("NIP dan nama guru wajib diisi.");
      return;
    }
    if (teachers.some((teacher) => teacher.nip.toLowerCase() === nip.toLowerCase() && teacher.id !== editing?.id)) {
      setFormError("NIP ini sudah terdaftar. Periksa kembali angkanya.");
      return;
    }

    if (editing) {
      updateDemoTeachers((previous) => previous.map((teacher) => teacher.id === editing.id ? { ...teacher, nip, nama } : teacher));
      addDemoActivity("Data guru diperbarui", `Admin memperbarui data ${nama} (NIP ${nip}).`);
      setMessage(`Data ${nama} berhasil diperbarui.`);
    } else {
      updateDemoTeachers((previous) => [{ id: `g-${createId()}`, nip, nama, status: "active" }, ...previous]);
      addDemoActivity("Data guru ditambahkan", `Admin menambahkan ${nama} (NIP ${nip}).`);
      setMessage(`Data ${nama} berhasil ditambahkan.`);
    }
    setPage(1);
    closeDialog();
  }

  function deleteTeacher(teacher: DemoTeacher) {
    updateDemoTeachers((previous) => previous.filter((item) => item.id !== teacher.id));
    addDemoActivity("Data guru dihapus", `Admin menghapus data ${teacher.nama} (NIP ${teacher.nip}).`);
    setMessage(`Data ${teacher.nama} berhasil dihapus.`);
    closeDialog();
  }

  function toggleTeacherStatus(teacher: DemoTeacher) {
    const status = teacher.status === "active" ? "inactive" : "active";
    updateDemoTeachers((previous) => previous.map((item) => item.id === teacher.id ? { ...item, status } : item));
    addDemoActivity(status === "inactive" ? "Data guru dinonaktifkan" : "Data guru diaktifkan kembali", `Admin mengubah data ${teacher.nama} (NIP ${teacher.nip}) menjadi ${status === "inactive" ? "nonaktif" : "aktif kembali"}.`);
    setMessage(`${teacher.nama} ${status === "inactive" ? "dinonaktifkan" : "diaktifkan kembali"}.`);
    closeDialog();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Data Guru</h1>
          <p className="mt-1 text-sm text-muted">Admin dapat menambahkan dan memperbarui data guru berdasarkan NIP.</p>
        </div>
        <button type="button" onClick={() => { setFormError(null); setDialog({ kind: "form" }); }} className={btn.primary}>
          <Plus size={16} aria-hidden /> Tambah guru
        </button>
      </div>

      {message && <p role="status" className="rounded-md bg-success-soft px-4 py-3 text-sm font-medium text-success">{message}</p>}

      <label className={`${field} flex max-w-xl items-center gap-2`}>
        <Search size={16} className="text-muted" aria-hidden />
        <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Cari nama atau NIP guru" aria-label="Cari nama atau NIP guru" className="w-full bg-transparent outline-none" />
      </label>

      <section aria-label="Daftar guru" className={`${card} overflow-hidden`}>
        {filtered.length === 0 ? (
          <EmptyState
            title={query ? "Guru tidak ditemukan" : "Belum ada data guru"}
            description={query ? "Coba cari dengan nama atau NIP yang berbeda." : "Tambahkan data guru dengan mengisi NIP dan nama."}
            action={!query && <button type="button" onClick={() => { setFormError(null); setDialog({ kind: "form" }); }} className={btn.outline}><Plus size={16} aria-hidden /> Tambah guru</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-128 text-sm">
              <thead>
                <tr className="bg-primary-soft text-left text-xs font-semibold text-muted">
                  <th scope="col" className={CELL}>NIP</th>
                  <th scope="col" className={CELL}>Nama guru</th>
                  <th scope="col" className={CELL}>Status</th>
                  <th scope="col" className={CELL}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-canvas">
                    <td className={`${CELL} tabular-nums`}>{teacher.nip}</td>
                    <td className={`${CELL} font-semibold`}>{teacher.nama}</td>
                    <td className={CELL}><Badge tone={teacher.status === "active" ? "success" : "neutral"}>{teacher.status === "active" ? "Aktif" : "Nonaktif"}</Badge></td>
                    <td className={CELL}>
                      <div className="flex gap-1">
                        <button type="button" aria-label={`Edit ${teacher.nama}`} title="Edit" onClick={() => setDialog({ kind: "form", teacher })} className="grid size-9 place-items-center rounded-md text-muted hover:bg-primary-soft hover:text-ink"><Pencil size={16} /></button>
                        <button type="button" aria-label={`${teacher.status === "active" ? "Nonaktifkan" : "Aktifkan"} ${teacher.nama}`} title={teacher.status === "active" ? "Nonaktifkan" : "Aktifkan"} onClick={() => setDialog({ kind: "status", teacher })} className="grid size-9 place-items-center rounded-md text-muted hover:bg-primary-soft hover:text-ink">
                          {teacher.status === "active" ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
                        </button>
                        <button type="button" aria-label={`Hapus ${teacher.nama}`} title="Hapus" onClick={() => setDialog({ kind: "delete", teacher })} className="grid size-9 place-items-center rounded-md text-danger hover:bg-danger-soft"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > PAGE_SIZE && <Pagination page={current} pageSize={PAGE_SIZE} total={filtered.length} unit="guru" onChange={setPage} />}
      </section>

      <Dialog open={dialog?.kind === "form"} title={dialog?.teacher ? "Edit data guru" : "Tambah guru"} onClose={closeDialog}>
        <form onSubmit={saveTeacher} noValidate className="mt-4 space-y-4">
          <label className="grid gap-2 text-sm font-medium">
            NIP
            <input name="nip" maxLength={30} defaultValue={dialog?.teacher?.nip ?? ""} className={field} autoComplete="off" />
          </label>
          {formError && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
          <label className="grid gap-2 text-sm font-medium">
            Nama guru
            <input name="nama" maxLength={120} defaultValue={dialog?.teacher?.nama ?? ""} className={field} autoComplete="name" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeDialog} className={btn.outline}>Batal</button>
            <button type="submit" className={btn.primary}>Simpan</button>
          </div>
        </form>
      </Dialog>

      <Dialog open={dialog?.kind === "delete"} title="Hapus data guru?" onClose={closeDialog}>
        <p className="mt-2 text-sm text-muted">Data <strong>{dialog?.teacher?.nama}</strong> (NIP {dialog?.teacher?.nip}) akan dihapus dari daftar guru.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={closeDialog} className={btn.outline}>Batal</button>
          <button type="button" onClick={() => dialog?.teacher && deleteTeacher(dialog.teacher)} className={btn.danger}>Hapus data</button>
        </div>
      </Dialog>

      <Dialog open={dialog?.kind === "status"} title={dialog?.teacher?.status === "active" ? "Nonaktifkan data guru?" : "Aktifkan kembali data guru?"} onClose={closeDialog}>
        <p className="mt-2 text-sm text-muted">
          Data <strong>{dialog?.teacher?.nama}</strong> (NIP {dialog?.teacher?.nip}) akan {dialog?.teacher?.status === "active" ? "dinonaktifkan" : "diaktifkan kembali"}.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={closeDialog} className={btn.outline}>Batal</button>
          <button type="button" onClick={() => dialog?.teacher && toggleTeacherStatus(dialog.teacher)} className={btn.primary}>Ya, lanjutkan</button>
        </div>
      </Dialog>
    </div>
  );
}
