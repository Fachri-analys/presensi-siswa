"use client";

import { ManageTable, type Column, type FieldDef } from "@/components/manage-table";
import { RoleGate } from "@/components/role-gate";
import { getKelasRows, getStudents } from "@/lib/mock";
import type { KelasRow } from "@/lib/types";

const columns: Column<KelasRow>[] = [
  { header: "Kelas", cell: (r) => <span className="font-semibold">{r.nama}</span> },
  { header: "Jurusan", cell: (r) => r.jurusan },
  { header: "Siswa", cell: (r) => getStudents(r.id).length },
  { header: "Ketua Kelas", cell: (r) => getStudents(r.id).find((s) => s.nis === r.ketua)?.nama ?? <span className="text-muted">Belum ditentukan</span> },
];
const fields: FieldDef<KelasRow>[] = [
  { name: "nama", label: "Nama kelas", required: true },
  { name: "jurusan", label: "Jurusan", required: true },
  // Ketua dipilih dari siswa kelas tersebut; kelas baru belum punya siswa.
  { name: "ketua", label: "Ketua Kelas", type: "select", options: (row) => (row ? getStudents(row.id).map((s) => ({ value: s.nis, label: s.nama })) : []) },
];

const validate = (values: Record<string, string>, rows: KelasRow[], editingId?: string) =>
  rows.some((r) => r.nama.toLowerCase() === values.nama.toLowerCase() && r.id !== editingId) ? "Nama kelas sudah ada." : null;

export default function KelasPage() {
  return (
    <RoleGate allow={["ADMIN"]}>
      <ManageTable<KelasRow> noun="kelas" initialRows={getKelasRows()} columns={columns} fields={fields} searchText={(r) => `${r.nama} ${r.jurusan}`} validate={validate} />
    </RoleGate>
  );
}
