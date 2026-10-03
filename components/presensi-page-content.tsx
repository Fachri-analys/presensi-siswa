"use client";

import Link from "next/link";
import { useRole } from "@/components/app-shell";
import { GuruPiketAttendance } from "@/components/guru-piket-attendance";
import { btn, card } from "@/components/ui";

export function PresensiPageContent({ initialClassId }: { initialClassId: string }) {
  const { role } = useRole();
  if (role === "GURU_PIKET" || role === "ADMIN") return <GuruPiketAttendance initialClassId={initialClassId} />;
  return (
    <section className={`${card} max-w-xl space-y-4 p-6`}>
      <h1 className="text-xl font-semibold">Presensi kelas</h1>
      <p className="text-sm text-muted">
        {role === "KETUA_KELAS"
          ? "Sebagai Ketua Kelas, Anda mencatat kehadiran siswa di kelas yang ditugaskan kepada Anda."
          : "Pencatatan presensi tersedia untuk Ketua Kelas dan Guru Piket."}
      </p>
      {role === "KETUA_KELAS" && <Link href="/dashboard" className={btn.primary}>Buka presensi kelas saya</Link>}
    </section>
  );
}
