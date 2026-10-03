"use client";

import { useRole } from "@/components/app-shell";
import { AdminDashboard } from "@/components/admin-dashboard";
import { GuruPiketDashboard } from "@/components/guru-piket-dashboard";
import { KetuaKelasDashboard } from "@/components/ketua-kelas-dashboard";

export default function DashboardPage() {
  const { role } = useRole();
  if (role === "GURU_PIKET") return <GuruPiketDashboard />;
  if (role === "KETUA_KELAS") return <KetuaKelasDashboard />;
  return <AdminDashboard />;
}
