import { MonitoringClassDetail } from "@/components/monitoring-class-detail";
import { getClass } from "@/lib/mock";
import { notFound } from "next/navigation";

export default async function ClassDetailPage({ params }: { params: Promise<{ kelas: string }> }) {
  const { kelas } = await params;
  if (!getClass(kelas)) {
    console.error("Halaman monitoring diminta untuk kelas yang tidak tersedia.", { kelas });
    notFound();
  }
  return <MonitoringClassDetail classId={kelas} />;
}
