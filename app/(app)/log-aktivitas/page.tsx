"use client";

import { useSyncExternalStore } from "react";
import { Clock3 } from "lucide-react";
import { getDemoActivityLogs, subscribeToDemoActivityLogs } from "@/lib/activity-log";
import { RoleGate } from "@/components/role-gate";
import { card, EmptyState } from "@/components/ui";

export default function LogAktivitasPage() {
  const logs = useSyncExternalStore(subscribeToDemoActivityLogs, getDemoActivityLogs, () => []);

  return (
    <RoleGate allow={["GURU_PIKET"]}>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Log Aktivitas</h1>
          <p className="mt-1 text-sm text-muted">Catatan perubahan terbaru ditulis dengan bahasa yang mudah dipahami.</p>
        </div>
        <section aria-label="Daftar log aktivitas" className={`${card} overflow-hidden`}>
          {logs.length === 0 ? (
            <EmptyState title="Belum ada aktivitas" description="Perubahan data siswa atau guru, presensi kelas, dan aktivitas keluar dari aplikasi akan muncul di sini." />
          ) : (
            <ol className="divide-y divide-line">
              {logs.map((entry) => (
                <li key={entry.id} className="flex gap-4 px-5 py-4">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Clock3 size={18} aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{entry.action}</p>
                    <p className="mt-1 text-sm text-muted">{entry.description}</p>
                    <time dateTime={entry.createdAt} className="mt-2 block text-xs text-muted">
                      {new Date(entry.createdAt).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </RoleGate>
  );
}
