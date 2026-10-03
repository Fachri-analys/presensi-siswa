import { PresensiPageContent } from "@/components/presensi-page-content";

export default async function PresensiIndex({ searchParams }: { searchParams: Promise<{ kelas?: string }> }) {
  const { kelas } = await searchParams;
  return <PresensiPageContent initialClassId={kelas ?? ""} />;
}
