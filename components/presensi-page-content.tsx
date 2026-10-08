"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/components/app-shell";
import { GuruPiketAttendance } from "@/components/guru-piket-attendance";

export function PresensiPageContent({ initialClassId }: { initialClassId: string }) {
  const { role } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (role === "KETUA_KELAS") {
      router.replace("/dashboard");
    }
  }, [role, router]);

  if (role === "KETUA_KELAS") {
    return null;
  }

  return <GuruPiketAttendance initialClassId={initialClassId} />;
}
