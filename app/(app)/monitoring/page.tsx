"use client";

import { GuruPiketDashboard } from "@/components/guru-piket-dashboard";
import { RoleGate } from "@/components/role-gate";

export default function MonitoringPage() {
  return (
    <RoleGate allow={["GURU_PIKET"]}>
      <GuruPiketDashboard />
    </RoleGate>
  );
}
