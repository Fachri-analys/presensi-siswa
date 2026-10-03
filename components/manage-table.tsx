"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { addDemoActivity } from "@/lib/activity-log";
import { createId } from "@/lib/id";
import { Dialog } from "./dialog";
import { btn, card, EmptyState, field, Pagination } from "./ui";

const PAGE_SIZE = 10;
const CELL = "px-4 py-3";

export interface Option { value: string; label: string }
export interface FieldDef<T> {
  name: keyof T & string;
  label: string;
  type?: "text" | "email" | "select";
  required?: boolean;
  options?: Option[] | ((row?: T) => Option[]);
}
export interface Column<T> { header: string; cell: (row: T) => ReactNode }
type Row = { id: string } & Record<string, string>;
const rowCache = new Map<string, unknown>();
const rowListeners = new Map<string, Set<() => void>>();

function getManagedRows<T extends Row>(key: string, initialRows: T[], fieldNames: string[]): T[] {
  if (rowCache.has(key)) return rowCache.get(key) as T[];
  try {
    const saved = window.sessionStorage.getItem(key);
    if (!saved) {
      rowCache.set(key, initialRows);
      return initialRows;
    }
    const parsed: unknown = JSON.parse(saved);
    const valid = Array.isArray(parsed) && parsed.every((item) =>
      typeof item === "object" && item !== null &&
      "id" in item && typeof item.id === "string" &&
      fieldNames.every((name) => name in item && typeof item[name] === "string")
    );
    if (!valid) throw new Error("Format data tersimpan tidak valid.");
    rowCache.set(key, parsed);
    return parsed as T[];
  } catch (error) {
    console.error("Data tabel demo tidak dapat dibaca.", error);
    rowCache.set(key, initialRows);
    return initialRows;
  }
}

export function useDemoManagedRows<T extends Row>(noun: string, initialRows: T[], fieldNames: string[]): T[] {
  const storageKey = `presensi-demo-${noun}`;
  return useSyncExternalStore(
    (listener) => subscribeToManagedRows(storageKey, listener),
    () => getManagedRows(storageKey, initialRows, fieldNames),
    () => initialRows,
  );
}

function subscribeToManagedRows(key: string, listener: () => void) {
  const listeners = rowListeners.get(key) ?? new Set<() => void>();
  listeners.add(listener);
  rowListeners.set(key, listeners);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) rowListeners.delete(key);
  };
}

interface Props<T extends Row> {
  noun: string;
  initialRows: T[];
  columns: Column<T>[];
  fields: FieldDef<T>[];
  searchText: (row: T) => string;
  rowActions?: (row: T) => ReactNode;
  /** Kembalikan pesan error, atau null jika valid. */
  validate?: (values: Record<string, string>, rows: T[], editingId?: string) => string | null;
  readOnly?: boolean;
}

/** Tabel CRUD demo Admin; perubahan data disimpan di sesi tab dan dicatat di log aktivitas. */
export function ManageTable<T extends Row>({ noun, initialRows, columns, fields, searchText, validate, readOnly, rowActions }: Props<T>) {
  const storageKey = `presensi-demo-${noun}`;
  const rows = useDemoManagedRows(noun, initialRows, fields.map((field) => field.name));
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ kind: "form" | "delete"; id?: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => searchText(r).toLowerCase().includes(q));
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const target = rows.find((r) => r.id === dialog?.id);
  const close = () => {
    setDialog(null);
    setFormError(null);
  };

  function saveRows(nextRows: T[]) {
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(nextRows));
      rowCache.set(storageKey, nextRows);
      rowListeners.get(storageKey)?.forEach((listener) => listener());
      return true;
    } catch (error) {
      console.error(`Data demo ${noun} gagal disimpan.`, error);
      setToast(`Data ${noun} belum berhasil disimpan. Coba lagi.`);
      return false;
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const data = new FormData(e.currentTarget);
    const values = Object.fromEntries(fields.map((f) => [f.name, String(data.get(f.name) ?? "").trim()]));
    const missing = fields.find((f) => f.required && !values[f.name]);
    if (missing) {
      setFormError(`${missing.label} wajib diisi.`);
      return;
    }
    const invalidEmail = fields.find((field) =>
      field.type === "email" && values[field.name] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[field.name])
    );
    if (invalidEmail) {
      setFormError(`${invalidEmail.label} harus menggunakan format email yang benar.`);
      return;
    }
    const message = validate?.(values, rows, target?.id) ?? null;
    if (message) {
      setFormError(message);
      return;
    }
    const nextRows = target
      ? rows.map((row) => row.id === target.id ? { ...row, ...values } : row)
      : [...rows, { id: createId(), ...values } as T];
    if (!saveRows(nextRows)) return;
    addDemoActivity(
      `Data ${noun} ${target ? "diperbarui" : "ditambahkan"}`,
      `Admin ${target ? "memperbarui" : "menambahkan"} data ${values.nama || values.email || noun}.`
    );
    close();
    setToast(`Data ${noun} disimpan`);
  }

  function remove(id: string) {
    const removed = rows.find((row) => row.id === id);
    if (!saveRows(rows.filter((row) => row.id !== id))) return;
    addDemoActivity(`Data ${noun} dihapus`, `Admin menghapus data ${removed?.nama ?? noun}.`);
    close();
    setToast(`Data ${noun} dihapus`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <label className={`${field} flex min-w-52 flex-1 items-center gap-2`}>
          <Search size={16} className="text-muted" aria-hidden />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder={`Cari ${noun}…`} aria-label={`Cari ${noun}`} className="w-full bg-transparent outline-none" />
        </label>
        {!readOnly && (
          <button type="button" onClick={() => { setFormError(null); setDialog({ kind: "form" }); }} className={btn.accent}>
            <Plus size={16} aria-hidden /> Tambah {noun}
          </button>
        )}
      </div>

      <div className={`${card} overflow-hidden`}>
        {filtered.length === 0 ? (
          <EmptyState title={`Data ${noun} tidak ditemukan`} description="Coba ubah kata kunci pencarian." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-176 text-sm">
              <thead>
                <tr className="bg-primary-soft text-left text-xs font-semibold text-muted">
                  {columns.map((c) => <th key={c.header} className={CELL}>{c.header}</th>)}
                  {!readOnly && <th className={CELL}>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    {columns.map((c) => <td key={c.header} className={CELL}>{c.cell(r)}</td>)}
                    {!readOnly && (
                      <td className={CELL}>
                        <div className="flex">
                          <button type="button" aria-label={`Edit ${r.nama ?? noun}`} title="Edit" onClick={() => { setFormError(null); setDialog({ kind: "form", id: r.id }); }} className="grid size-10 pointer-coarse:size-12 place-items-center rounded-md text-muted hover:bg-primary-soft hover:text-ink"><Pencil size={18} /></button>
                          <button type="button" aria-label={`Hapus ${r.nama ?? noun}`} title="Hapus" onClick={() => setDialog({ kind: "delete", id: r.id })} className="grid size-10 pointer-coarse:size-12 place-items-center rounded-md text-danger hover:bg-primary-soft"><Trash2 size={18} /></button>
                          {rowActions?.(r)}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={current} pageSize={PAGE_SIZE} total={filtered.length} unit={noun} onChange={setPage} />
      </div>

      <Dialog open={dialog?.kind === "form"} title={target ? `Edit ${noun}` : `Tambah ${noun}`} onClose={close}>
        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          {fields.map((f) => {
            const options = typeof f.options === "function" ? f.options(target) : (f.options ?? []);
            const shared = { name: f.name, required: f.required, defaultValue: target?.[f.name] ?? "", className: field };
            return (
              <label key={f.name} className="grid gap-2 text-sm font-medium">
                {f.label}
                {f.type === "select" ? (
                  <select {...shared}>
                    <option value="" disabled={f.required}>{f.required ? "Pilih…" : "—"}</option>
                    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input {...shared} type={f.type ?? "text"} maxLength={120} />
                )}
              </label>
            );
          })}
          {formError && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className={btn.outline}>Batal</button>
            <button type="submit" className={btn.primary}>Simpan</button>
          </div>
        </form>
      </Dialog>

      <Dialog open={dialog?.kind === "delete"} title={`Hapus ${noun}?`} onClose={close}>
        <p className="mt-2 text-sm text-muted">Data yang dihapus tidak dapat dikembalikan dari layar ini.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={close} className={btn.outline}>Batal</button>
          <button type="button" onClick={() => target && remove(target.id)} className={btn.danger}>Hapus</button>
        </div>
      </Dialog>

      {toast && <div role="status" className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white">{toast}</div>}
    </div>
  );
}
