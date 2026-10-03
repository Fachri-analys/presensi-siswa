"use client";

import { useState, type ReactNode } from "react";
import type { Student } from "@/lib/types";
import { card, EmptyState, Pagination, StatusBadge } from "./ui";

const PAGE_SIZE = 10;
const CELL = "px-4 py-3";

interface StudentTableProps {
  students: Student[];
  /** Jika diisi, kolom Aksi tampil (menggantikan Keterangan). */
  actions?: (student: Student) => ReactNode;
}

export function StudentTable({ students, actions }: StudentTableProps) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = students.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  if (!students.length) {
    return (
      <div className={card}>
        <EmptyState title="Siswa tidak ditemukan" description="Coba ubah kata kunci atau filter status." />
      </div>
    );
  }

  return (
    <div className={`${card} overflow-hidden`}>
      <ul className="divide-y divide-line md:hidden">
        {rows.map((s) => (
          <li key={s.nis} className="flex items-center gap-2 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{s.nama}</p>
              <p className="text-xs text-muted">NIS {s.nis}{s.waktu ? ` · ${s.waktu}` : ""}</p>
            </div>
            <StatusBadge status={s.status} />
            {actions?.(s)}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-176 text-sm">
          <thead>
            <tr className="bg-primary-soft text-left text-xs font-semibold text-muted">
              <th className={CELL}>NIS</th>
              <th className={CELL}>Nama</th>
              <th className={CELL}>Status</th>
              <th className={CELL}>Waktu Presensi</th>
              <th className={CELL}>{actions ? "Aksi" : "Keterangan"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.nis} className="border-t border-line">
                <td className={`${CELL} text-muted`}>{s.nis}</td>
                <td className={`${CELL} font-semibold`}>{s.nama}</td>
                <td className={CELL}><StatusBadge status={s.status} /></td>
                <td className={CELL}>{s.waktu ? `${s.waktu} WIB` : "—"}</td>
                <td className={`${CELL} ${actions ? "" : "text-muted"}`}>{actions ? actions(s) : s.keterangan || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={current} pageSize={PAGE_SIZE} total={students.length} unit="siswa" onChange={setPage} />
    </div>
  );
}
