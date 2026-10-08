"use client";

import { useState } from "react";
import { useRole } from "@/components/app-shell";
import { RoleGate } from "@/components/role-gate";
import { GuruPiketStudents } from "@/components/guru-piket-students";
import { SemesterAttendanceStats } from "@/components/semester-attendance-stats";
import { OWN_CLASS_ID } from "@/lib/mock";

export default function SiswaPage() {
  const { role } = useRole();
  const [activeTab, setActiveTab] = useState<"daftar" | "semester">("daftar");

  return (
    <RoleGate allow={["ADMIN", "KETUA_KELAS", "GURU_PIKET"]}>
      <div className="space-y-6">
        {/* Navigasi Tab */}
        <div className="flex border-b border-line gap-2 overflow-x-auto whitespace-nowrap pb-px" role="tablist" aria-label="Pilihan tampilan siswa">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "daftar"}
            onClick={() => setActiveTab("daftar")}
            className={`shrink-0 pb-3 pt-1 px-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === "daftar"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            Daftar Siswa
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "semester"}
            onClick={() => setActiveTab("semester")}
            className={`shrink-0 pb-3 pt-1 px-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === "semester"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            Statistik Kehadiran Semester
          </button>
        </div>

        {activeTab === "daftar" ? (
          <GuruPiketStudents
            key={role}
            fixedClassId={role === "KETUA_KELAS" ? OWN_CLASS_ID : undefined}
          />
        ) : (
          <SemesterAttendanceStats
            initialClassId={role === "KETUA_KELAS" ? OWN_CLASS_ID : undefined}
          />
        )}
      </div>
    </RoleGate>
  );
}
