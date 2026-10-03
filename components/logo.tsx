import Image from "next/image";

/** Logo resmi SMK Negeri 11 Jakarta. Dekoratif (alt kosong) karena selalu berdampingan dengan nama sekolah. */
export function Logo({ size = 40 }: { size?: number }) {
  return <Image src="/logo-smkn11-transparent.webp" alt="" width={size} height={size} className="shrink-0 object-contain" priority />;
}
