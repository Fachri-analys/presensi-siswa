"use client";

import { useRole } from "@/components/app-shell";
import { RoleGate } from "@/components/role-gate";
import { GuruPiketStudents } from "@/components/guru-piket-students";
import { OWN_CLASS_ID } from "@/lib/mock";

export default function SiswaPage() {
  const { role } = useRole();
  return (
    <RoleGate allow={["ADMIN", "KETUA_KELAS", "GURU_PIKET"]}>
      <GuruPiketStudents
        key={role}
        fixedClassId={role === "KETUA_KELAS" ? OWN_CLASS_ID : undefined}
      />
    </RoleGate>
  );
}
