"use client";

import type { ReactNode } from "react";
import type { Role } from "@/lib/types";
import { useRole } from "./app-shell";
import { card, EmptyState } from "./ui";

/** Pembatas tampilan saja; pembatasan akses sebenarnya tetap di backend. */
export function RoleGate({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { role } = useRole();
  if (role === "ADMIN" || allow.includes(role)) return <>{children}</>;
  return (
    <div className={card}>
      <EmptyState title="Halaman tidak tersedia" description="Halaman ini tidak dapat diakses oleh role Anda." />
    </div>
  );
}
