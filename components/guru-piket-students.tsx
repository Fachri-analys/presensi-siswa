"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Search, ShieldCheck, ShieldOff, Trash2, X } from "lucide-react";
import type { SchoolClass, SchoolStudent } from "@/lib/data/contracts";
import { useRole } from "@/components/app-shell";
import { createApiSchoolRepository } from "@/lib/data/api-school";
import { apiErrorMessage } from "@/lib/data/api-client";
import { Dialog } from "./dialog";
import { Badge, btn, card, EmptyState, field, Pagination } from "./ui";

const PAGE_SIZE = 10;
const CELL = "px-3 py-3 xl:px-4";
type StudentStatus = "active" | "inactive";
type ManagedStudent = SchoolStudent;
type PendingAction = { kind: "deactivate" | "activate" | "delete"; student: ManagedStudent } | null;

function getClassName(classes: SchoolClass[], id: string) {
  return classes.find((item) => item.id === id)?.nama ?? "—";
}

export function GuruPiketStudents({
  fixedClassId,
}: {
  fixedClassId?: string;
}) {
  const { role } = useRole();
  const isAdmin = role === "ADMIN";
  const [students, setStudents] = useState<ManagedStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StudentStatus>("all");
  const [classFilter, setClassFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<PendingAction>(null);
  const [editing, setEditing] = useState<ManagedStudent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const repo = createApiSchoolRepository();
    if (!repo) { setToast("Backend belum dikonfigurasi."); return; }
    try {
      const selectedClassId = fixedClassId ?? (classFilter === "all" ? undefined : classFilter);
      const studentsPage = await repo.listStudents({
        cursor: String(page),
        limit: PAGE_SIZE,
        search: query.trim() || undefined,
        kelasId: selectedClassId,
        status: isAdmin ? statusFilter : "active",
      }, signal);
      if (signal?.aborted) return;
      const lastPage = Math.max(1, Math.ceil(studentsPage.total / PAGE_SIZE));
      if (page > lastPage) { setPage(lastPage); return; }
      setStudents(studentsPage.items);
      setTotal(studentsPage.total);
    } catch (err: unknown) {
      if (!signal?.aborted) setToast(`Gagal memuat data: ${apiErrorMessage(err)}`);
    }
  }, [classFilter, fixedClassId, isAdmin, page, query, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => refresh(controller.signal));
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    const controller = new AbortController();
    const repo = createApiSchoolRepository();
    if (repo) {
      void repo.listClasses(undefined, controller.signal)
        .then((classesPage) => setClasses(classesPage.items))
        .catch((err: unknown) => {
          if (!controller.signal.aborted) setToast(`Gagal memuat kelas: ${apiErrorMessage(err)}`);
        });
    }
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const visible = students;

  const isFiltered = query.trim() !== "" || classFilter !== "all" || (isAdmin && statusFilter !== "all");

  async function completeAction() {
    if (!pending) return;
    if (!isAdmin) {
      console.error("Aksi pengelolaan data siswa ditolak: hanya Admin yang dapat mengubah data siswa.");
      setPending(null);
      return;
    }
    const { student, kind } = pending;
    const schoolRepo = createApiSchoolRepository();
    if (!schoolRepo) { setToast("Backend belum dikonfigurasi."); setPending(null); return; }

    if (kind === "delete") {
      if (schoolRepo) {
        try {
          await schoolRepo.deleteStudent(student.id);
        } catch (err: unknown) {
          setToast(`Gagal menghapus siswa: ${apiErrorMessage(err)}`);
          setPending(null);
          return;
        }
      }
      await refresh();
      setToast(`Data ${student.nama} berhasil dihapus.`);
    } else {
      const nextStatus: StudentStatus = kind === "deactivate" ? "inactive" : "active";
      if (schoolRepo) {
        try {
          await schoolRepo.setStudentActive(student.id, nextStatus === "active");
        } catch (err: unknown) {
          setToast(`Gagal mengubah status siswa: ${apiErrorMessage(err)}`);
          setPending(null);
          return;
        }
      }
      await refresh();
      setToast(`${student.nama} ${nextStatus === "inactive" ? "dinonaktifkan" : "diaktifkan kembali"}.`);
    }
    setPending(null);
  }

  async function saveStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!isAdmin) {
      console.error("Aksi pengelolaan data siswa ditolak: hanya Admin yang dapat mengubah data siswa.");
      setShowForm(false);
      setEditing(null);
      return;
    }
    const data = new FormData(event.currentTarget);
    const nis = String(data.get("nis") ?? "").trim();
    const nama = String(data.get("nama") ?? "").trim();
    const kelasId = fixedClassId ?? String(data.get("kelasId") ?? "");
    if (!/^\d+$/.test(nis)) {
      setFormError("NIS harus diisi dengan angka saja.");
      return;
    }
    if (students.some((student) => student.nis === nis && student.id !== editing?.id)) {
      setFormError("NIS ini sudah terdaftar. Periksa kembali angkanya.");
      return;
    }
    if (!nama || !classes.some((item) => item.id === kelasId && (item.active || item.id === editing?.kelasId))) {
      setFormError("Nama siswa dan kelas wajib diisi dengan benar.");
      return;
    }

    const schoolRepo = createApiSchoolRepository();
    if (!schoolRepo) { setFormError("Backend belum dikonfigurasi."); return; }

    if (editing) {
      if (schoolRepo) {
        try {
          await schoolRepo.updateStudent(editing.id, { nis, nama, kelasId });
        } catch (err: unknown) {
          setFormError(`Gagal memperbarui data siswa: ${apiErrorMessage(err)}`);
          return;
        }
      }
      await refresh();
      setToast(`Data ${nama} berhasil diperbarui.`);
    } else {
      if (schoolRepo) {
        try {
          await schoolRepo.createStudent({ nis, nama, kelasId });
        } catch (err: unknown) {
          setFormError(`Gagal menambahkan siswa: ${apiErrorMessage(err)}`);
          return;
        }
      }
      await refresh();
      setToast(`Data ${nama} berhasil ditambahkan.`);
    }
    setShowForm(false);
    setEditing(null);
  }

  const deleteDialog = pending?.kind === "delete";
  const statusDialog = pending?.kind === "deactivate" || pending?.kind === "activate";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {fixedClassId ? `Siswa ${getClassName(classes, fixedClassId)}` : "Data Siswa"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isAdmin
              ? "Admin dapat mengelola data siswa di semua kelas."
              : fixedClassId
                ? "Daftar siswa kelas Anda. Pengelolaan siswa hanya dilakukan oleh Admin."
                : "Daftar siswa aktif di semua kelas. Pengelolaan siswa hanya dilakukan oleh Admin."}
          </p>
        </div>
        {isAdmin && (
          <button type="button" onClick={() => { setEditing(null); setFormError(null); setShowForm(true); }} className={btn.accent}>
            <Plus size={16} aria-hidden /> Tambah siswa
          </button>
        )}
      </div>

      {/* Search & Filter Controls — consistent card layout */}
      <section aria-label="Filter daftar siswa" className={`${card} p-3.5 sm:p-4`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className={`${field} flex flex-1 items-center gap-2 bg-canvas/70`}>
            <Search size={16} className="text-muted shrink-0" aria-hidden />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="Cari nama atau NIS siswa…"
              aria-label="Cari nama atau NIS siswa"
              className="w-full bg-transparent outline-none"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {!fixedClassId && (
              <select
                aria-label="Filter kelas"
                value={classFilter}
                onChange={(event) => { setClassFilter(event.target.value); setPage(1); }}
                className={`${field} bg-canvas/70 min-w-36`}
              >
                <option value="all">Semua kelas</option>
                {classes.filter((item) => item.active || item.id === editing?.kelasId).map((item) => (
                  <option key={item.id} value={item.id}>{item.nama}{item.active ? "" : " (nonaktif)"}</option>
                ))}
              </select>
            )}
            {isAdmin && (
              <select
                aria-label="Filter status akun"
                value={statusFilter}
                onChange={(event) => { setStatusFilter(event.target.value as "all" | StudentStatus); setPage(1); }}
                className={`${field} bg-canvas/70 min-w-36`}
              >
                <option value="all">Semua status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            )}
            {isFiltered && (
              <button
                type="button"
                onClick={() => { setQuery(""); setClassFilter("all"); setStatusFilter("all"); setPage(1); }}
                className="inline-flex h-10 items-center gap-1 rounded-md px-3 text-xs font-semibold text-danger hover:bg-danger-soft transition-colors pointer-coarse:h-12"
              >
                <X size={14} aria-hidden />
                <span>Reset filter</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Data Table */}
      <section aria-label="Tabel daftar siswa" className={`${card} overflow-hidden`}>
        {visible.length === 0 ? (
          <EmptyState title="Siswa tidak ditemukan" description="Coba periksa kembali kata kunci, kelas, atau status yang dipilih." />
        ) : (
          <>
            {/* Mobile list view */}
            <ul className="divide-y divide-line md:hidden">
              {visible.map((student) => (
                <li key={student.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{student.nama}</p>
                    <p className="text-xs text-muted">NIS {student.nis} · {getClassName(classes, student.kelasId)}</p>
                  </div>
                  {isAdmin && (
                    <Badge tone={student.status === "active" ? "success" : "neutral"}>
                      {student.status === "active" ? "Aktif" : "Nonaktif"}
                    </Badge>
                  )}
                  {isAdmin && (
                    <div className="flex shrink-0 gap-1">
                      <button type="button" aria-label={`Edit ${student.nama}`} onClick={() => { setEditing(student); setFormError(null); setShowForm(true); }} className="grid size-9 place-items-center rounded-md text-muted hover:bg-primary-soft">
                        <Pencil size={16} />
                      </button>
                      <button type="button" aria-label={`Hapus ${student.nama}`} onClick={() => setPending({ kind: "delete", student })} className="grid size-9 place-items-center rounded-md text-danger hover:bg-danger-soft">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-160 text-sm">
                <thead>
                  <tr className="bg-primary-soft text-left text-xs font-semibold text-muted">
                    <th scope="col" className={CELL}>NIS</th>
                    <th scope="col" className={CELL}>Nama</th>
                    <th scope="col" className={CELL}>Kelas</th>
                    {isAdmin && <th scope="col" className={CELL}>Status akun</th>}
                    {isAdmin && <th scope="col" className={`${CELL} text-right`}>Tindakan</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visible.map((student) => (
                    <tr key={student.id} className="hover:bg-canvas/50 transition-colors">
                      <td className={`${CELL} tabular-nums text-muted`}>{student.nis}</td>
                      <td className={`${CELL} font-semibold text-ink`}>{student.nama}</td>
                      <td className={CELL}>{getClassName(classes, student.kelasId)}</td>
                      {isAdmin && (
                        <td className={CELL}>
                          <Badge tone={student.status === "active" ? "success" : "neutral"}>
                            {student.status === "active" ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </td>
                      )}
                      {isAdmin && (
                        <td className={`${CELL} text-right`}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => { setEditing(student); setFormError(null); setShowForm(true); }}
                              className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-colors"
                            >
                              <Pencil size={13} aria-hidden /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setPending({ kind: student.status === "active" ? "deactivate" : "activate", student })}
                              className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs font-medium text-muted hover:bg-canvas hover:text-ink transition-colors"
                            >
                              {student.status === "active" ? <><ShieldOff size={13} aria-hidden /> Nonaktifkan</> : <><ShieldCheck size={13} aria-hidden /> Aktifkan</>}
                            </button>
                            <button
                              type="button"
                              aria-label={`Hapus ${student.nama}`}
                              onClick={() => setPending({ kind: "delete", student })}
                              className="grid size-8 place-items-center rounded-md text-danger hover:bg-danger-soft transition-colors"
                              title="Hapus data"
                            >
                              <Trash2 size={15} aria-hidden />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={total} unit="siswa" onChange={setPage} />}
      </section>

      {isAdmin && <Dialog open={Boolean(statusDialog)} title={pending?.kind === "deactivate" ? "Nonaktifkan data siswa?" : "Aktifkan kembali data siswa?"} onClose={() => setPending(null)}>
        <p className="mt-2 text-sm text-muted">
          {pending?.kind === "deactivate"
            ? <><strong>{pending.student.nama}</strong> tidak akan muncul pada daftar presensi aktif sampai datanya diaktifkan kembali.</>
            : <><strong>{pending?.student.nama}</strong> akan muncul kembali pada daftar presensi aktif.</>}
        </p>
        <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-line">
          <button type="button" onClick={() => setPending(null)} className={btn.outline}>Batal</button>
          <button type="button" onClick={completeAction} className={btn.primary}>Ya, lanjutkan</button>
        </div>
      </Dialog>}

      {isAdmin && <Dialog open={Boolean(deleteDialog)} title="Hapus data siswa?" onClose={() => setPending(null)}>
        <p className="mt-2 text-sm text-muted">Data <strong>{pending?.student.nama}</strong> akan dihapus dari backend.</p>
        <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-line">
          <button type="button" onClick={() => setPending(null)} className={btn.outline}>Batal</button>
          <button type="button" onClick={completeAction} className={btn.danger}>Hapus data</button>
        </div>
      </Dialog>}

      {isAdmin && <Dialog open={showForm} title={editing ? "Edit data siswa" : "Tambah siswa"} onClose={() => { setShowForm(false); setEditing(null); }}>
        <form onSubmit={saveStudent} noValidate className="mt-4 space-y-4">
          <label className="grid gap-2 text-sm font-medium">
            NIS
            <input name="nis" inputMode="numeric" maxLength={20} defaultValue={editing?.nis ?? ""} className={field} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Nama siswa
            <input name="nama" maxLength={120} defaultValue={editing?.nama ?? ""} className={field} />
          </label>
          {!fixedClassId && <label className="grid gap-2 text-sm font-medium">
            Kelas
            <select name="kelasId" defaultValue={editing?.kelasId ?? ""} className={field}>
              <option value="" disabled>Pilih kelas</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}
            </select>
          </label>}
          {formError && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className={btn.outline}>Batal</button>
            <button type="submit" className={btn.primary}>Simpan</button>
          </div>
        </form>
      </Dialog>}

      {toast && <div role="status" className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>}
    </div>
  );
}
