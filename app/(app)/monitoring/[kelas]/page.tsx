"use client";

import { use, useEffect, useState } from "react";
import { MonitoringClassDetail } from "@/components/monitoring-class-detail";
import { createApiSchoolRepository } from "@/lib/data/api-school";
import type { SchoolClass } from "@/lib/data/contracts";
import Link from "next/link";
import { btn } from "@/components/ui";

export default function ClassDetailPage({ params }: { params: Promise<{ kelas: string }> }) {
  const { kelas } = use(params);
  const [classData, setClassData] = useState<SchoolClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchClass = async () => {
      const schoolRepo = createApiSchoolRepository();
      if (!schoolRepo) {
        if (!active) return;
        setLoading(false);
        return;
      }
      try {
        const data = await schoolRepo.getClass(kelas);
        if (!active) return;
        setClassData(data);
      } catch (err) {
        if (!active) return;
        console.warn("Gagal memuat detail kelas dari API:", err);
        setError("Kelas tidak ditemukan atau gagal dimuat dari server.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchClass();
    return () => {
      active = false;
    };
  }, [kelas]);

  if (loading) {
    return (
      <main className="p-6 text-center" role="status">
        <p className="text-sm text-muted">Memuat data kelas...</p>
      </main>
    );
  }

  if (error && !classData) {
    return (
      <main className="p-6 space-y-4">
        <h1 className="text-xl font-semibold">Kelas Tidak Ditemukan</h1>
        <p className="text-sm text-muted">{error}</p>
        <div>
          <Link href="/monitoring" className={btn.outline}>
            Kembali ke monitoring
          </Link>
        </div>
      </main>
    );
  }

  return <MonitoringClassDetail classId={kelas} initialClass={classData ?? undefined} />;
}
