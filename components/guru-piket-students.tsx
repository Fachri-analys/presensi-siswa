"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Pencil, Plus, Search, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { addDemoActivity } from "@/lib/activity-log";
import { getDemoStudents, getDemoStudentsServerSnapshot, subscribeToDemoStudents, updateDemoStudents, type DemoStudent } from "@/lib/demo-students";
import { getClasses } from "@/lib/mock";
import { useRole } from "@/components/app-shell";
import { Dialog } from "./dialog";
import { Badge, btn, card, EmptyState, field, Pagination } from "./ui";

const PAGE_SIZE = 10;
const CELL = "px-4 py-3";
type StudentStatus = "active" | "inactive";
type ManagedStudent = DemoStudent;
type PendingAction = { kind: "deactivate" | "activate" | "delete"; student: ManagedStudent } | null;

const classes = getClasses();
const className = (id: string) => classes.find((item) => item.id === id)?.nama ?? "—";

export function GuruPiketStudents({
  fixedClassId,
}: {
  fixedClassId?: string;
}) {
  const { role } = useRole();
  const isAdmin = role === "ADMIN";
  const students = useSyncExternalStore(subscribeToDemoStudents, getDemoStudents, getDemoStudentsServerSnapshot);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StudentStatus>("all");
  const [classFilter, setClassFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<PendingAction>(null);
  const [editing, setEditing] = useState<ManagedStudent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return students.filter((student) =>
      (isAdmin || student.status === "active") &&
      (statusFilter === "all" || student.status === statusFilter) &&
      (fixedClassId ? student.kelasId === fixedClassId : classFilter === "all" || student.kelasId === classFilter) &&
      (!search || `${student.nis} ${student.nama} ${className(student.kelasId)}`.toLowerCase().includes(search))
    );
  }, [students, query, statusFilter, classFilter, fixedClassId, isAdmin]);
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function completeAction() {
    if (!pending) return;
    if (!isAdmin) {
      console.error("Aksi pengelolaan data siswa ditolak: hanya Admin yang dapat mengubah data siswa.");
      setPending(null);
      return;
    }
    const { student, kind } = pending;
    if (kind === "delete") {
      updateDemoStudents((previous) => previous.filter((item) => item.id !== student.id));
      addDemoActivity("Data siswa dihapus", `Admin menghapus data ${student.nama} (${student.nis}) dari daftar siswa.`);
      setToast(`Data ${student.nama} berhasil dihapus.`);
    } else {
      const nextStatus: StudentStatus = kind === "deactivate" ? "inactive" : "active";
      updateDemoStudents((previous) => previous.map((item) => item.id === student.id ? { ...item, status: nextStatus } : item));
      addDemoActivity(
        nextStatus === "inactive" ? "Data siswa dinonaktifkan" : "Data siswa diaktifkan kembali",
        `Admin mengubah data ${student.nama} (${student.nis}) menjadi ${nextStatus === "inactive" ? "nonaktif sehingga tidak masuk daftar presensi aktif" : "aktif kembali"}.`
      );
      setToast(`${student.nama} ${nextStatus === "inactive" ? "dinonaktifkan" : "diaktifkan kembali"}.`);
    }
    setPending(null);
  }

  function saveStudent(event: React.FormEvent<HTMLFormElement>) {
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
    if (!nama || !classes.some((item) => item.id === kelasId)) {
      setFormError("Nama siswa dan kelas wajib diisi dengan benar.");
      return;
    }
    if (editing) {
      updateDemoStudents((previous) => previous.map((student) =>
        student.id === editing.id ? { ...student, nis, nama, kelasId } : student
      ));
      addDemoActivity("Data siswa diperbarui", `Admin memperbarui data ${nama} (${nis}).`);
      setToast(`Data ${nama} berhasil diperbarui.`);
    } else {
      const newStudent: ManagedStudent = { id: `s-${nis}`, nis, nama, kelasId, status: "active" };
      updateDemoStudents((previous) => [newStudent, ...previous]);
      addDemoActivity("Data siswa ditambahkan", `Admin menambahkan ${nama} (${nis}) ke kelas ${className(kelasId)}.`);
      setToast(`Data ${nama} berhasil ditambahkan.`);
    }
    setShowForm(false);
    setEditing(null);
  }

  const deleteDialog = pending?.kind === "delete";
  const statusDialog = pending?.kind === "deactivate" || pending?.kind === "activate";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{fixedClassId ? `Siswa ${className(fixedClassId)}` : "Data Siswa"}</h1>
        <p className="mt-1 text-sm text-muted">
          {isAdmin
            ? "Admin dapat mengelola data siswa di semua kelas."
            : fixedClassId
              ? "Daftar siswa kelas Anda. Pengelolaan siswa hanya dilakukan oleh Admin."
              : "Daftar siswa aktif di semua kelas. Pengelolaan siswa hanya dilakukan oleh Admin."}
        </p>
      </div>

      <section aria-label="Filter daftar siswa" className={`${card} grid gap-3 p-4 ${fixedClassId ? "md:grid-cols-[1fr]" : isAdmin ? "md:grid-cols-[1fr_12rem_12rem]" : "md:grid-cols-[1fr_12rem]"}`}>
        <label className={`${field} flex items-center gap-2`}>
          <Search size={16} className="text-muted" aria-hidden />
          <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Cari nama atau NIS siswa" aria-label="Cari nama atau NIS siswa" className="w-full bg-transparent outline-none" />
        </label>
        {!fixedClassId && <label className="grid gap-1 text-xs font-medium text-muted">
            Kelas
            <select value={classFilter} onChange={(event) => { setClassFilter(event.target.value); setPage(1); }} className={field}>
              <option value="all">Semua kelas</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}
            </select>
          </label>}
        {isAdmin && <label className="grid gap-1 text-xs font-medium text-muted">
            Status akun
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as "all" | StudentStatus); setPage(1); }} className={field}>
              <option value="all">Semua status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </label>}
      </section>

      {isAdmin && (
        <button type="button" onClick={() => { setEditing(null); setFormError(null); setShowForm(true); }} className={btn.accent}>
          <Plus size={16} aria-hidden /> Tambah siswa
        </button>
      )}

      <div className={`${card} overflow-hidden`}>
        {filtered.length === 0 ? (
          <EmptyState title="Siswa tidak ditemukan" description="Coba periksa kembali kata kunci, kelas, atau status yang dipilih." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-240 text-sm">
              <thead>
                <tr className="bg-primary-soft text-left text-xs font-semibold text-muted">
                  {["NIS", "Nama", "Kelas", ...(isAdmin ? ["Status akun"] : [])].map((heading) => <th key={heading} scope="col" className={CELL}>{heading}</th>)}
                  {isAdmin && <th scope="col" className={CELL}>Tindakan</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((student) => (
                  <tr key={student.id} className="hover:bg-canvas">
                    <td className={`${CELL} tabular-nums`}>{student.nis}</td>
                    <td className={`${CELL} font-semibold`}>{student.nama}</td>
                    <td className={CELL}>{className(student.kelasId)}</td>
                    {isAdmin && <td className={CELL}><Badge tone={student.status === "active" ? "success" : "neutral"}>{student.status === "active" ? "Aktif" : "Nonaktif"}</Badge></td>}
                    {isAdmin && <td className={CELL}>
                      <div className="flex flex-wrap gap-1">
                        <button type="button" onClick={() => { setEditing(student); setFormError(null); setShowForm(true); }} className={`${btn.outline} h-9 px-3 text-xs`}>
                          <Pencil size={14} aria-hidden /> Edit
                        </button>
                        <button type="button" onClick={() => setPending({ kind: student.status === "active" ? "deactivate" : "activate", student })} className={`${btn.outline} h-9 px-3 text-xs`}>
                            {student.status === "active" ? <><ShieldOff size={14} aria-hidden /> Nonaktifkan</> : <><ShieldCheck size={14} aria-hidden /> Aktifkan</>}
                        </button>
                        <button type="button" aria-label={`Hapus ${student.nama}`} onClick={() => setPending({ kind: "delete", student })} className="grid size-9 place-items-center rounded-md text-danger hover:bg-danger-soft" title="Hapus data">
                          <Trash2 size={16} aria-hidden />
                        </button>
                      </div>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > PAGE_SIZE && <Pagination page={current} pageSize={PAGE_SIZE} total={filtered.length} unit="siswa" onChange={setPage} />}
      </div>

      {isAdmin && <Dialog open={Boolean(statusDialog)} title={pending?.kind === "deactivate" ? "Nonaktifkan data siswa?" : "Aktifkan kembali data siswa?"} onClose={() => setPending(null)}>
        <p className="mt-2 text-sm text-muted">
          {pending?.kind === "deactivate"
            ? <><strong>{pending.student.nama}</strong> tidak akan muncul pada daftar presensi aktif sampai datanya diaktifkan kembali.</>
            : <><strong>{pending?.student.nama}</strong> akan muncul kembali pada daftar presensi aktif.</>}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setPending(null)} className={btn.outline}>Batal</button>
          <button type="button" onClick={completeAction} className={btn.primary}>Ya, lanjutkan</button>
        </div>
      </Dialog>}

      {isAdmin && <Dialog open={Boolean(deleteDialog)} title="Hapus data siswa?" onClose={() => setPending(null)}>
        <p className="mt-2 text-sm text-muted">Data <strong>{pending?.student.nama}</strong> akan dihapus dari daftar ini dan tidak bisa dipulihkan dari tampilan mock.</p>
        <div className="mt-5 flex justify-end gap-2">
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
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className={btn.outline}>Batal</button>
            <button type="submit" className={btn.primary}>Simpan</button>
          </div>
        </form>
      </Dialog>}

      {toast && <div role="status" className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white">{toast}</div>}
    </div>
  );
}
