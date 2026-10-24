"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { RoleGate } from "@/components/role-gate";
import { card, EmptyState } from "@/components/ui";
import { createApiActivityRepository } from "@/lib/data/api-activity";
import { apiErrorMessage } from "@/lib/data/api-client";
import type { AuditEntry } from "@/lib/data/contracts";

export default function LogAktivitasPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void Promise.resolve().then(() => {
      const repo = createApiActivityRepository();
      if (!repo) { setError("Backend belum dikonfigurasi."); return; }
      return repo.listActivity({ limit: 50 }).then((page) => setLogs(page.items)).catch((err: unknown) => setError(apiErrorMessage(err)));
    });
  }, []);
  return <RoleGate allow={["GURU_PIKET", "ADMIN"]}><div className="space-y-5">
    <div><h1 className="text-2xl font-semibold">Log Aktivitas</h1><p className="mt-1 text-sm text-muted">Catatan perubahan dari backend.</p></div>
    {error && <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">Gagal memuat log: {error}</p>}
    <section aria-label="Daftar log aktivitas" className={`${card} overflow-hidden`}>{logs.length === 0 ? <EmptyState title="Belum ada aktivitas" description="Aktivitas yang dicatat backend akan muncul di sini." /> : <ol className="divide-y divide-line">{logs.map((entry) => <li key={entry.id} className="flex gap-4 px-5 py-4"><span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Clock3 size={18} aria-hidden /></span><div className="min-w-0 flex-1"><p className="font-semibold">{entry.action}</p><p className="mt-1 text-sm text-muted">{entry.actorName} · {entry.objectType}{entry.objectId ? ` (${entry.objectId})` : ""}</p><time dateTime={entry.createdAt} className="mt-2 block text-xs text-muted">{new Date(entry.createdAt).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}</time></div></li>)}</ol>}</section>
  </div></RoleGate>;
}
