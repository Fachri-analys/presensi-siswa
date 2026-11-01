"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Search, ShieldCheck, ShieldOff, Trash2, X } from "lucide-react";
import { createApiAdminRepository } from "@/lib/data/api-admin";
import { apiErrorMessage } from "@/lib/data/api-client";
import type { SchoolTeacher } from "@/lib/data/contracts";
import { Badge, btn, card, EmptyState, field, Pagination } from "./ui";
import { Dialog } from "./dialog";

const PAGE_SIZE = 10;
const CELL = "px-3 py-3 xl:px-4";

export function AdminTeachers() {
  const [teachers, setTeachers] = useState<SchoolTeacher[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<SchoolTeacher | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const refresh = useCallback(async () => {
    const repo = createApiAdminRepository();
    if (!repo) { setError("Backend belum dikonfigurasi."); return; }
    try {
      setTeachers((await repo.listTeachers()).items);
      setError(null);
    } catch (err: unknown) {
      setError(apiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const data = new FormData(event.currentTarget);
    const input = {
      nip: String(data.get("nip") ?? "").trim(),
      nama: String(data.get("nama") ?? "").trim(),
    };
    const repo = createApiAdminRepository();
    try {
      if (!repo) throw new Error("Backend belum dikonfigurasi.");
      if (editing === "new") await repo.createTeacher(input);
      else if (editing) await repo.updateTeacher(editing.id, input);
      setEditing(null);
      setMessage("Data guru tersimpan.");
      await refresh();
    } catch (err: unknown) {
      setError(apiErrorMessage(err));
    }
  }

  async function toggle(teacher: SchoolTeacher) {
    const repo = createApiAdminRepository();
    try {
      if (!repo) throw new Error("Backend belum dikonfigurasi.");
      await repo.setTeacherActive(teacher.id, teacher.status !== "active");
      await refresh();
    } catch (err: unknown) {
      setError(apiErrorMessage(err));
    }
  }

  async function remove(teacher: SchoolTeacher) {
    if (!window.confirm(`Hapus data ${teacher.nama}?`)) return;
    const repo = createApiAdminRepository();
    try {
      if (!repo) throw new Error("Backend belum dikonfigurasi.");
      await repo.deleteTeacher(teacher.id);
      await refresh();
    } catch (err: unknown) {
      setError(apiErrorMessage(err));
    }
  }

  const search = query.trim().toLowerCase();
  const filtered = teachers.filter((teacher) =>
    `${teacher.nip} ${teacher.nama}`.toLowerCase().includes(search)
  );
  const isFiltered = search !== "";
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Data Guru</h1>
          <p className="mt-1 text-sm text-muted">Kelola data guru sekolah.</p>
        </div>
        <button type="button" onClick={() => setEditing("new")} className={btn.primary}>
          <Plus size={16} aria-hidden /> Tambah guru
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
      )}

      {/* Search & Filter Controls — consistent card layout */}
      <section aria-label="Filter daftar guru" className={`${card} p-3.5 sm:p-4`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className={`${field} flex flex-1 items-center gap-2 bg-canvas/70`}>
            <Search size={16} className="text-muted shrink-0" aria-hidden />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="Cari nama atau NIP guru…"
              aria-label="Cari nama atau NIP guru"
              className="w-full bg-transparent outline-none"
            />
          </label>
          {isFiltered && (
            <button
              type="button"
              onClick={() => { setQuery(""); setPage(1); }}
              className="inline-flex h-10 items-center gap-1 rounded-md px-3 text-xs font-semibold text-danger hover:bg-danger-soft transition-colors pointer-coarse:h-12"
            >
              <X size={14} aria-hidden />
              <span>Reset filter</span>
            </button>
          )}
        </div>
      </section>

      {/* Data Table */}
      <section aria-label="Tabel daftar guru" className={`${card} overflow-hidden`}>
        {filtered.length === 0 ? (
          <EmptyState
            title={query ? "Guru tidak ditemukan" : "Belum ada data guru"}
            description={query ? "Coba kata kunci yang berbeda." : "Tambahkan data guru dari backend."}
          />
        ) : (
          <>
            {/* Mobile list view */}
            <ul className="divide-y divide-line md:hidden">
              {visible.map((teacher) => (
                <li key={teacher.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{teacher.nama}</p>
                    <p className="text-xs text-muted">NIP {teacher.nip}</p>
                  </div>
                  <Badge tone={teacher.status === "active" ? "success" : "neutral"}>
                    {teacher.status === "active" ? "Aktif" : "Nonaktif"}
                  </Badge>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" aria-label={`Edit ${teacher.nama}`} onClick={() => setEditing(teacher)} className="grid size-9 place-items-center rounded-md text-muted hover:bg-primary-soft">
                      <Pencil size={16} />
                    </button>
                    <button type="button" aria-label={`Hapus ${teacher.nama}`} onClick={() => void remove(teacher)} className="grid size-9 place-items-center rounded-md text-danger hover:bg-danger-soft">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-128 text-sm">
                <thead>
                  <tr className="bg-primary-soft text-left text-xs font-semibold text-muted">
                    <th scope="col" className={CELL}>NIP</th>
                    <th scope="col" className={CELL}>Nama guru</th>
                    <th scope="col" className={CELL}>Status</th>
                    <th scope="col" className={`${CELL} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visible.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-canvas/50 transition-colors">
                      <td className={`${CELL} tabular-nums text-muted`}>{teacher.nip}</td>
                      <td className={`${CELL} font-semibold text-ink`}>{teacher.nama}</td>
                      <td className={CELL}>
                        <Badge tone={teacher.status === "active" ? "success" : "neutral"}>
                          {teacher.status === "active" ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className={`${CELL} text-right`}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            aria-label={`Edit ${teacher.nama}`}
                            onClick={() => setEditing(teacher)}
                            className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-colors"
                          >
                            <Pencil size={13} aria-hidden /> Edit
                          </button>
                          <button
                            type="button"
                            aria-label={`${teacher.status === "active" ? "Nonaktifkan" : "Aktifkan"} ${teacher.nama}`}
                            onClick={() => void toggle(teacher)}
                            className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs font-medium text-muted hover:bg-canvas hover:text-ink transition-colors"
                          >
                            {teacher.status === "active" ? <><ShieldOff size={13} aria-hidden /> Nonaktifkan</> : <><ShieldCheck size={13} aria-hidden /> Aktifkan</>}
                          </button>
                          <button
                            type="button"
                            aria-label={`Hapus ${teacher.nama}`}
                            onClick={() => void remove(teacher)}
                            className="grid size-8 place-items-center rounded-md text-danger hover:bg-danger-soft transition-colors"
                            title="Hapus data"
                          >
                            <Trash2 size={15} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {filtered.length > PAGE_SIZE && (
          <Pagination page={current} pageSize={PAGE_SIZE} total={filtered.length} unit="guru" onChange={setPage} />
        )}
      </section>

      {/* Form Dialog */}
      <Dialog
        open={Boolean(editing)}
        title={editing === "new" ? "Tambah data guru" : "Edit data guru"}
        onClose={() => setEditing(null)}
      >
        <form onSubmit={save} className="mt-4 space-y-4">
          <label className="grid gap-2 text-sm font-medium">
            NIP
            <input
              name="nip"
              required
              maxLength={30}
              defaultValue={editing && typeof editing === "object" ? editing.nip : ""}
              className={field}
              autoComplete="off"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Nama guru
            <input
              name="nama"
              required
              maxLength={120}
              defaultValue={editing && typeof editing === "object" ? editing.nama : ""}
              className={field}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <button type="button" onClick={() => setEditing(null)} className={btn.outline}>Batal</button>
            <button type="submit" className={btn.primary}>Simpan</button>
          </div>
        </form>
      </Dialog>

      {message && (
        <div role="status" className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {message}
        </div>
      )}
    </div>
  );
}
